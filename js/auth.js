/**
 * YatraLocal - Authentication Manager (/js/auth.js)
 * 
 * Supabase Auth Integration:
 * - Email + password signup and login
 * - Session persistence across page refreshes
 * - Accessible modal dialog with focus trapping and ESC support
 * - Dynamic header auth status pill & logout
 * - Saral Mode simplified big-button auth
 * - Bilingual error messaging (English & Hindi)
 */

import { getSupabase } from './supabase.js';
import { store } from './store.js';

let activeAuthModal = null;
let lastFocusedElement = null;

/**
 * Initializes Supabase Auth listeners and populates store
 */
export async function initAuth() {
  try {
    const supabase = await getSupabase();
    if (!supabase || !supabase.auth) return;

    // Check existing session
    const { data } = await supabase.auth.getSession();
    if (data && data.session && data.session.user) {
      updateUserInStore(data.session.user);
    }

    // Subscribe to auth state transitions
    supabase.auth.onAuthStateChange((event, session) => {
      const user = session ? session.user : null;
      updateUserInStore(user);
      renderHeaderAuthPill();
    });
  } catch (err) {
    console.warn('[YatraLocal Auth] Init warning:', err.message);
  }

  renderHeaderAuthPill();
}

function updateUserInStore(user) {
  if (user) {
    const displayName = (user.user_metadata && (user.user_metadata.name || user.user_metadata.full_name)) ||
      user.email.split('@')[0];
    store.setState({
      currentUser: {
        id: user.id,
        email: user.email,
        name: displayName,
        rawUser: user
      }
    });
  } else {
    store.setState({ currentUser: null });
  }
}

export function getCurrentUser() {
  const state = store.getState();
  return state.currentUser || null;
}

/**
 * Updates the user account badge / Log In button in the global header
 */
export function renderHeaderAuthPill() {
  if (typeof document === 'undefined') return;
  const navContainer = document.getElementById('nav-user-slot') || document.querySelector('.nav-actions');
  if (!navContainer) return;

  let authPill = document.getElementById('header-auth-pill');
  if (!authPill) {
    authPill = document.createElement('div');
    authPill.id = 'header-auth-pill';
    authPill.style.display = 'inline-flex';
    authPill.style.alignItems = 'center';
    authPill.style.gap = '8px';
    navContainer.prepend(authPill);
  }

  const user = getCurrentUser();
  const lang = (store.getState().language || 'EN').toUpperCase();
  const isHi = lang === 'HI';

  if (user) {
    authPill.innerHTML = `
      <div class="user-profile-badge" style="display: flex; align-items: center; gap: 6px; background: #E6F4EA; border: 1px solid #CEEAD6; padding: 4px 10px; border-radius: 9999px; font-size: 0.85rem; color: #137333;">
        <span aria-hidden="true">👤</span>
        <strong style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(user.name)}</strong>
      </div>
      <button type="button" id="header-logout-btn" class="btn btn-outline btn-sm" style="padding: 4px 8px; font-size: 0.8rem;" aria-label="${isHi ? 'लॉग आउट' : 'Log out of account'}">
        ${isHi ? 'लॉग आउट' : 'Log Out'}
      </button>
    `;

    const logoutBtn = authPill.querySelector('#header-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await logOut();
      });
    }
  } else {
    authPill.innerHTML = `
      <button type="button" id="header-login-btn" class="btn btn-outline btn-sm" style="padding: 5px 12px; font-size: 0.85rem;" aria-label="${isHi ? 'लॉग इन करें' : 'Log in or sign up'}">
        🔑 ${isHi ? 'लॉग इन' : 'Log In'}
      </button>
    `;

    const loginBtn = authPill.querySelector('#header-login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        showAuthModal({ initialMode: 'login', triggerEl: loginBtn });
      });
    }
  }
}

/**
 * Sign In with email & password
 */
export async function logIn(email, password) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password
  });

  if (error) {
    throw new Error(translateAuthError(error.message));
  }

  if (data && data.user) {
    updateUserInStore(data.user);
    renderHeaderAuthPill();
  }
  return data;
}

/**
 * Sign Up with email, password & author name
 */
export async function signUp(email, password, name = '') {
  const cleanName = name.trim().slice(0, 40) || email.split('@')[0];
  const supabase = await getSupabase();

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { name: cleanName }
    }
  });

  if (error) {
    throw new Error(translateAuthError(error.message));
  }

  if (data && data.user) {
    updateUserInStore(data.user);
    renderHeaderAuthPill();
  }
  return data;
}

/**
 * Log Out
 */
export async function logOut() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  store.setState({ currentUser: null });
  renderHeaderAuthPill();
}

/**
 * Displays the Accessible Auth Modal
 */
export function showAuthModal({ onAuthSuccess = null, initialMode = 'login', triggerEl = null } = {}) {
  if (typeof document === 'undefined') return;
  closeAuthModal();

  lastFocusedElement = triggerEl || document.activeElement;
  let mode = initialMode; // 'login' | 'signup'
  const lang = (store.getState().language || 'EN').toUpperCase();
  const isHi = lang === 'HI';

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';
  overlay.id = 'auth-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'auth-modal-title');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.55)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.padding = '16px';
  overlay.style.zIndex = '99999';

  function renderFormContent() {
    return `
      <div class="modal card" style="max-width: 440px; width: 100%; padding: 24px; position: relative; background: #FFFFFF; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
        <button type="button" id="auth-close-btn" class="btn btn-ghost" style="position: absolute; top: 12px; right: 12px; padding: 6px; font-size: 1.2rem;" aria-label="${isHi ? 'बंद करें' : 'Close auth modal'}">✕</button>

        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 2rem;">🪷</span>
          <h2 id="auth-modal-title" style="margin: 6px 0 2px; color: #0D5C5B; font-size: 1.4rem;">
            ${mode === 'login' ? (isHi ? 'यात्राLocal में लॉग इन करें' : 'Log in to YatraLocal') : (isHi ? 'खाता बनाएं' : 'Create Your Account')}
          </h2>
          <p style="margin: 0; font-size: 0.85rem; color: #6B7280;">
            ${mode === 'login' 
              ? (isHi ? 'समीक्षा लिखने और अपनी यात्राएं सहेजने के लिए प्रवेश करें' : 'Sign in to share verified reviews & sync trips across India') 
              : (isHi ? 'भारत-भर के यात्रियों के साथ अनुभव साझा करें' : 'Join fellow mindful travellers supporting local communities')}
          </p>
        </div>

        <div style="display: flex; border-bottom: 2px solid #E5E7EB; margin-bottom: 18px;">
          <button type="button" id="tab-login" style="flex: 1; padding: 8px; font-weight: bold; background: none; border: none; cursor: pointer; border-bottom: 3px solid ${mode === 'login' ? '#0D5C5B' : 'transparent'}; color: ${mode === 'login' ? '#0D5C5B' : '#6B7280'};">
            ${isHi ? 'लॉग इन' : 'Log In'}
          </button>
          <button type="button" id="tab-signup" style="flex: 1; padding: 8px; font-weight: bold; background: none; border: none; cursor: pointer; border-bottom: 3px solid ${mode === 'signup' ? '#0D5C5B' : 'transparent'}; color: ${mode === 'signup' ? '#0D5C5B' : '#6B7280'};">
            ${isHi ? 'नया खाता' : 'Sign Up'}
          </button>
        </div>

        <div id="auth-error-alert" style="display: none; background: #FEF2F2; border-left: 4px solid #EF4444; padding: 10px 12px; border-radius: 4px; margin-bottom: 14px; font-size: 0.85rem; color: #B91C1C;"></div>

        <form id="auth-form" class="flow" style="display: flex; flex-direction: column; gap: 12px;">
          ${mode === 'signup' ? `
            <div>
              <label for="auth-name-input" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">
                ${isHi ? 'आपका नाम' : 'Your Name / First Name'}
              </label>
              <input type="text" id="auth-name-input" class="form-input" placeholder="e.g. Ananya" required maxlength="40" style="width: 100%; padding: 8px 12px; border: 1.5px solid #D1D5DB; border-radius: 6px;">
            </div>
          ` : ''}

          <div>
            <label for="auth-email-input" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">
              ${isHi ? 'ईमेल पता' : 'Email Address'}
            </label>
            <input type="email" id="auth-email-input" class="form-input" placeholder="you@example.com" required style="width: 100%; padding: 8px 12px; border: 1.5px solid #D1D5DB; border-radius: 6px;">
          </div>

          <div>
            <label for="auth-pass-input" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">
              ${isHi ? 'पासवर्ड (कम से कम 6 अक्षर)' : 'Password (min. 6 characters)'}
            </label>
            <input type="password" id="auth-pass-input" class="form-input" placeholder="••••••••" required minlength="6" style="width: 100%; padding: 8px 12px; border: 1.5px solid #D1D5DB; border-radius: 6px;">
          </div>

          <button type="submit" id="auth-submit-btn" class="btn btn-primary" style="margin-top: 6px; padding: 10px; font-weight: bold; width: 100%;">
            ${mode === 'login' ? (isHi ? 'लॉग इन करें' : 'Log In') : (isHi ? 'खाता बनाएं' : 'Create Account')}
          </button>
        </form>

        <div style="margin-top: 16px; text-align: center; font-size: 0.78rem; color: #6B7280;">
          🔒 ${isHi ? 'सुरक्षित प्रमाणीकरण। हम आपका डेटा कभी नहीं बेचते।' : 'Secure auth via Supabase. We never sell your data or store phone numbers.'}
        </div>
      </div>
    `;
  }

  overlay.innerHTML = renderFormContent();
  document.body.appendChild(overlay);
  activeAuthModal = overlay;

  function bindEvents() {
    const closeBtn = overlay.querySelector('#auth-close-btn');
    const tabLogin = overlay.querySelector('#tab-login');
    const tabSignup = overlay.querySelector('#tab-signup');
    const form = overlay.querySelector('#auth-form');
    const errorAlert = overlay.querySelector('#auth-error-alert');
    const submitBtn = overlay.querySelector('#auth-submit-btn');

    closeBtn.addEventListener('click', closeAuthModal);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAuthModal();
    });

    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAuthModal();
    });

    tabLogin.addEventListener('click', () => {
      mode = 'login';
      overlay.innerHTML = renderFormContent();
      bindEvents();
    });

    tabSignup.addEventListener('click', () => {
      mode = 'signup';
      overlay.innerHTML = renderFormContent();
      bindEvents();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorAlert.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = isHi ? 'कृपया प्रतीक्षा करें...' : 'Please wait...';

      const email = overlay.querySelector('#auth-email-input').value;
      const pass = overlay.querySelector('#auth-pass-input').value;
      const nameInput = overlay.querySelector('#auth-name-input');
      const name = nameInput ? nameInput.value : '';

      try {
        if (mode === 'signup') {
          await signUp(email, pass, name);
        } else {
          await logIn(email, pass);
        }

        closeAuthModal();
        if (typeof onAuthSuccess === 'function') {
          onAuthSuccess(getCurrentUser());
        }
      } catch (err) {
        errorAlert.textContent = err.message;
        errorAlert.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = mode === 'login' ? (isHi ? 'लॉग इन करें' : 'Log In') : (isHi ? 'खाता बनाएं' : 'Create Account');
      }
    });

    const firstInput = overlay.querySelector('input');
    if (firstInput) firstInput.focus();
  }

  bindEvents();
}

export function closeAuthModal() {
  if (activeAuthModal && activeAuthModal.parentNode) {
    activeAuthModal.parentNode.removeChild(activeAuthModal);
    activeAuthModal = null;
  }
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

function translateAuthError(msg) {
  const isHi = (store.getState().language || 'EN').toUpperCase() === 'HI';
  if (!msg) return isHi ? 'एक अज्ञात त्रुटि हुई।' : 'An unknown error occurred.';

  if (msg.includes('Invalid login credentials')) {
    return isHi ? 'अमान्य ईमेल या पासवर्ड। कृपया पुनः प्रयास करें।' : 'Invalid login credentials. Please check and try again.';
  }
  if (msg.includes('User already registered')) {
    return isHi ? 'यह ईमेल पहले से पंजीकृत है। कृपया लॉग इन करें।' : 'This email is already registered. Please log in.';
  }
  if (msg.includes('Password should be at least')) {
    return isHi ? 'पासवर्ड में कम से कम 6 अक्षर होने चाहिए।' : 'Password must be at least 6 characters long.';
  }
  return msg;
}
