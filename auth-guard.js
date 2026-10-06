/*
 * auth-guard.js
 * Load this with a plain <script src="auth-guard.js"></script> near the top of any page
 * that should require sign-in. It hides the page, checks the Supabase session, and either
 * reveals the page (adding a signed-in chip with Profile, Admin and Sign out) or sends the
 * visitor to login.html. Suspended accounts are signed out.
 *
 * Pages that need the client or the user's profile can listen for the 'auth-ready' event:
 *   window.addEventListener('auth-ready', e => { const { sb, user, profile } = e.detail; ... });
 * or read window.authContext if it is already set.
 */
(function () {
  var SUPABASE_URL = 'https://eqekhzjhgplkwhliqrvn.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_2WEdnHl8YjEzJg1-KAVq3w_3_6RxDAl';
  var LOGIN = new URL('login.html', location.href);

  // Hide the page until the session check finishes, so nothing flashes for signed-out visitors.
  var hide = document.createElement('style');
  hide.id = 'auth-guard-hide';
  hide.textContent = 'html{visibility:hidden}';
  document.head.appendChild(hide);

  function toLogin(reason) {
    LOGIN.searchParams.set('next', location.pathname + location.search);
    if (reason) LOGIN.searchParams.set('reason', reason);
    location.replace(LOGIN.href);
  }

  function reveal() {
    var s = document.getElementById('auth-guard-hide');
    if (s) s.remove();
  }

  function link(text, href, cls) {
    var a = document.createElement('a');
    a.className = cls;
    a.href = new URL(href, location.href).href;
    a.textContent = text;
    return a;
  }

  function addChip(sb, user, profile) {
    var css = document.createElement('style');
    css.textContent =
      '.ag-chip{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--fg-dim,#7a8299);white-space:nowrap}' +
      '.ag-email{max-width:180px;overflow:hidden;text-overflow:ellipsis}' +
      '.ag-out{font-size:12px;cursor:pointer}' +
      '.ag-link{font-size:12px;color:var(--accent,#7c6cff);text-decoration:none}.ag-link:hover{text-decoration:underline}' +
      '@media (max-width:700px){.ag-email{display:none}}';
    document.head.appendChild(css);

    var chip = document.createElement('div');
    chip.className = 'ag-chip';
    var name = document.createElement('span');
    name.className = 'ag-email';
    name.textContent = (profile && profile.full_name) || user.email || '';
    name.title = user.email || '';
    chip.appendChild(name);
    chip.appendChild(link('Profile', 'profile.html', 'ag-link'));
    if (profile && profile.app_role === 'admin') chip.appendChild(link('Admin', 'admin.html', 'ag-link'));

    var out = document.createElement('button');
    out.className = 'ag-out';
    out.type = 'button';
    out.textContent = 'Sign out';
    out.addEventListener('click', async function () {
      out.disabled = true;
      await sb.auth.signOut();
      location.replace(new URL('login.html', location.href).href);
    });
    chip.appendChild(out);

    var mount = document.querySelector('.hdr-right') || document.querySelector('header');
    if (mount) {
      mount.appendChild(chip);
    } else {
      chip.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9999;background:#12151e;border:1px solid #252b3b;border-radius:8px;padding:6px 10px';
      document.body.appendChild(chip);
    }
  }

  import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
    .then(async function (mod) {
      var sb = mod.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      window.supabaseClient = sb; // available to the app for future data work

      var res = await sb.auth.getSession();
      var session = res.data && res.data.session;
      if (!session) return toLogin();

      var pr = await sb.from('profiles')
        .select('id,email,full_name,avatar_url,app_role,status')
        .eq('id', session.user.id).maybeSingle();
      var profile = pr && pr.data;

      if (profile && profile.status === 'suspended') {
        await sb.auth.signOut();
        return toLogin('suspended');
      }

      sb.auth.onAuthStateChange(function (event) {
        if (event === 'SIGNED_OUT') toLogin();
      });

      var ready = function () {
        addChip(sb, session.user, profile);
        if (profile && profile.app_role) document.documentElement.setAttribute('data-role', profile.app_role);
        window.authContext = { sb: sb, user: session.user, profile: profile, url: SUPABASE_URL, key: SUPABASE_KEY };
        window.dispatchEvent(new CustomEvent('auth-ready', { detail: window.authContext }));
        reveal();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
      else ready();
    })
    .catch(function () {
      // If the auth library can't load, fail closed: send the visitor to the login page.
      toLogin();
    });
})();
