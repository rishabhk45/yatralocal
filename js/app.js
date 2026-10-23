/**
 * YatraLocal - Main Application Entrypoint
 * Orchestrates router, store, accessibility hooks, modal, toast, and floating SOS.
 */

import { router } from './router.js';
import { store } from './store.js';
import { renderLandingView } from '../pages/landing.js';
import { renderPlanView } from '../pages/plan.js';
import { renderItineraryView } from '../pages/itinerary.js';
import { renderStaysView } from '../pages/stays.js';
import { renderSaralView } from '../pages/saral.js';
import { renderBookingView } from '../pages/booking.js';
import { renderTripsView } from '../pages/trips.js';
import { renderOwnerView } from '../pages/owner.js';
import { renderSosView } from '../pages/sos.js';
import { renderNotFoundView } from '../pages/not-found.js';
import { renderStyleGuide } from '../pages/style-guide.js';
import { renderPlaceView } from '../pages/place.js';
import { sosEngine } from './sos.js';
import { i18n } from './i18n.js';
import { initAuth } from './auth.js';

function renderStubView(title, description, nextLink, nextLabel) {
  return () => `
    <div class="container" style="padding: var(--space-8) var(--space-4);">
      <div class="card flow" style="max-width: 680px; margin: 0 auto;">
        <span class="badge badge-demo">Upcoming Phase</span>
        <h2>${title}</h2>
        <p style="color: var(--color-text-muted);">${description}</p>
        <div>
          <a href="${nextLink}" class="btn btn-primary">${nextLabel}</a>
        </div>
      </div>
    </div>
  `;
}

// Modal helper
function openModal({ title, content }) {
  const modal = document.getElementById('app-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  if (!modal || !modalTitle || !modalBody) return;

  modalTitle.textContent = title || 'Notification';
  modalBody.innerHTML = content || '';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');

  const closeBtn = document.getElementById('modal-close');
  closeBtn?.focus();
}

function closeModal() {
  const modal = document.getElementById('app-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

// Toast helper
function showToast(message, duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span>${message}</span>
    <button type="button" style="background:none;border:none;color:white;cursor:pointer;margin-left:8px;" aria-label="Dismiss">&times;</button>
  `;

  toast.querySelector('button').addEventListener('click', () => toast.remove());
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, duration);
}

// Global helper attachment
window.YatraApp = {
  openModal,
  closeModal,
  showToast,
  store,
  router
};

// Initialize App
function init() {
  // Register Routes
  router.register('#/', renderLandingView);
  router.register('#/plan', renderPlanView);
  router.register('#/itinerary', renderItineraryView);
  router.register('#/stays', renderStaysView);
  router.register('#/saral', renderSaralView);
  router.register('#/booking', renderBookingView);
  router.register('#/trips', renderTripsView);
  router.register('#/bookings', renderTripsView);
  router.register('#/owner', renderOwnerView);
  router.register('#/sos', renderSosView);
  router.register('#/place', renderPlaceView);
  router.register('#/404', renderNotFoundView);
  router.register('#/styleguide', renderStyleGuide);

  // Initialize Supabase Auth & Header status
  initAuth();

  // Initialize i18n
  i18n.init().then(() => {
    i18n.translateDOM();
  });

  // Initialize router
  router.init('app-view');

  // Modal close handlers
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('app-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'app-modal') closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Initialize Floating SOS Engine with 2s hold + progress ring
  sosEngine.initGlobalButton('#global-sos-btn');

  // Saral Mode Global Sync & Toggle
  const saralToggleBtn = document.getElementById('saral-toggle');
  const syncSaralUI = (isEnabled) => {
    document.documentElement.classList.toggle('saral', isEnabled);
    if (saralToggleBtn) {
      saralToggleBtn.classList.toggle('active', isEnabled);
      saralToggleBtn.setAttribute('aria-pressed', String(isEnabled));
      const label = saralToggleBtn.querySelector('#saral-btn-label');
      if (label) label.textContent = isEnabled ? 'Saral ON ☀️' : 'Saral Mode';
    }
  };

  // Initial Saral state restore
  const initialSaral = store.getState().saralMode || window.location.hash.startsWith('#/saral');
  syncSaralUI(initialSaral);

  saralToggleBtn?.addEventListener('click', () => {
    const currentState = store.getState().saralMode;
    const newState = !currentState;
    store.setSaralMode(newState);
    syncSaralUI(newState);
    showToast(newState ? '☀️ Saral Easy Mode Enabled (22px+ Font, Big Buttons)' : 'Standard Mode Restored');
  });

  // Auto-activate Saral mode styles when navigating to #/saral
  window.addEventListener('hashchange', () => {
    if (window.location.hash.startsWith('#/saral')) {
      syncSaralUI(true);
    }
  });

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
  const siteNav = document.getElementById('site-nav');
  mobileMenuBtn?.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('mobile-open');
    mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
  });

  // Close mobile nav when clicking a link
  siteNav?.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      siteNav.classList.remove('mobile-open');
      mobileMenuBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  // Language selector
  const langSelect = document.getElementById('lang-select');
  if (langSelect) {
    langSelect.value = store.getState().language || 'EN';
  }

  langSelect?.addEventListener('change', (e) => {
    const newLang = e.target.value;
    store.setLanguage(newLang);
    i18n.translateDOM();
    router._handleRouteChange();
    showToast(newLang === 'HI' ? 'भाषा बदलकर हिंदी कर दी गई है' : 'Language set to English');
  });

  // Re-translate whenever store language changes
  store.subscribe((state) => {
    if (langSelect && langSelect.value !== state.language) {
      langSelect.value = state.language || 'EN';
    }
    i18n.translateDOM();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
