/*
 * auth-guard.js
 * Load this with a plain <script src="auth-guard.js"></script> near the top of any page
 * that should require sign-in. It hides the page, checks the Supabase session, and either
 * reveals the page (adding a signed-in chip with a Sign out button) or sends the visitor
 * to login.html.
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

  function toLogin() {
    LOGIN.searchParams.set('next', location.pathname + location.search);
    location.replace(LOGIN.href);
  }

  function reveal() {
    var s = document.getElementById('auth-guard-hide');
    if (s) s.remove();
  }

  function addChip(sb, user) {
    var css = document.createElement('style');
    css.textContent =
      '.ag-chip{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--fg-dim,#7a8299);white-space:nowrap}' +
      '.ag-email{max-width:180px;overflow:hidden;text-overflow:ellipsis}' +
      '.ag-out{font-size:12px;cursor:pointer}' +
      '@media (max-width:700px){.ag-email{display:none}}';
    document.head.appendChild(css);

    var chip = document.createElement('div');
    chip.className = 'ag-chip';
    var email = document.createElement('span');
    email.className = 'ag-email';
    email.textContent = user.email || '';
    email.title = user.email || '';
    var out = document.createElement('button');
    out.className = 'ag-out';
    out.type = 'button';
    out.textContent = 'Sign out';
    out.addEventListener('click', async function () {
      out.disabled = true;
      await sb.auth.signOut();
      location.replace(new URL('login.html', location.href).href);
    });
    chip.appendChild(email);
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

      sb.auth.onAuthStateChange(function (event) {
        if (event === 'SIGNED_OUT') toLogin();
      });

      var ready = function () { addChip(sb, session.user); reveal(); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
      else ready();
    })
    .catch(function () {
      // If the auth library can't load, fail closed: send the visitor to the login page.
      toLogin();
    });
})();
