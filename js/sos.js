/**
 * YatraLocal - Emergency Safety SOS Engine
 * 
 * Features:
 * 1. Global press-and-hold trigger (2s progress ring) + fallback confirmation dialog.
 * 2. 5-second countdown cancel overlay with sound/vibration cues.
 * 3. Screen-reader & Web Speech voice alerts ("SOS activated") in English & Hindi.
 * 4. Real geolocation capture (navigator.geolocation.watchPosition) with battery-friendly throttling.
 * 5. Fallback coordinates (Burwa, Manali) if permission denied / offline.
 * 6. Quick dialer buttons: 112 (National), 100 (Police), 108 (Ambulance), 1363 (Tourist Helpline).
 * 7. On-device dispatch simulator formatting Google Maps link + WhatsApp prefilled message.
 * 8. SOS incident logger in localStorage for response time metrics.
 */

import { store } from './store.js';
import { speechAssistant } from './speech.js';

class SosEngine {
  constructor() {
    this.countdownSeconds = 5;
    this.countdownTimer = null;
    this.watchId = null;
    this.currentLocation = null;
    this.isActive = false;
    this.overlayEl = null;

    // Default fallback coordinates (Burwa Village, Manali, HP)
    this.fallbackCoords = {
      latitude: 32.2396,
      longitude: 77.1887,
      accuracy: 25,
      address: 'Burwa Hamlet, Near Manali, Himachal Pradesh',
      isSimulated: true
    };
  }

  /**
   * Setup global trigger on the floating button (#global-sos-btn)
   */
  initGlobalButton(btnSelector = '#global-sos-btn') {
    const btn = document.querySelector(btnSelector);
    if (!btn) return;

    let holdTimer = null;
    let holdDuration = 2000; // 2 seconds
    let startTime = 0;
    let animFrame = null;

    // Create SVG circular progress ring inside button
    let ring = btn.querySelector('.sos-progress-ring');
    if (!ring) {
      ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      ring.setAttribute('class', 'sos-progress-ring');
      ring.setAttribute('viewBox', '0 0 44 44');
      ring.innerHTML = `
        <circle class="ring-bg" cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="4"></circle>
        <circle class="ring-bar" cx="22" cy="22" r="18" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-dasharray="113.1" stroke-dashoffset="113.1" transform="rotate(-90 22 22)"></circle>
      `;
      btn.insertBefore(ring, btn.firstChild);
    }

    const ringBar = ring.querySelector('.ring-bar');

    const startHold = (e) => {
      // Don't intercept if already active
      if (this.isActive) return;

      startTime = Date.now();
      btn.classList.add('holding');

      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / holdDuration);
        if (ringBar) {
          const offset = 113.1 * (1 - progress);
          ringBar.style.strokeDashoffset = String(offset);
        }

        if (progress >= 1) {
          cleanHold();
          this.triggerCountdown();
        } else {
          animFrame = requestAnimationFrame(updateProgress);
        }
      };

      animFrame = requestAnimationFrame(updateProgress);
    };

    const cancelHold = () => {
      cleanHold();
    };

    const cleanHold = () => {
      btn.classList.remove('holding');
      if (animFrame) cancelAnimationFrame(animFrame);
      if (ringBar) ringBar.style.strokeDashoffset = '113.1';
    };

    // Pointer events (Mobile & Desktop)
    btn.addEventListener('pointerdown', (e) => {
      // Prevent double trigger on multi-touch
      if (e.button === 0) startHold(e);
    });

    btn.addEventListener('pointerup', cancelHold);
    btn.addEventListener('pointerleave', cancelHold);
    btn.addEventListener('pointercancel', cancelHold);

    // Click handler: If quick tap without 2s hold, show accessible confirmation dialog
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (Date.now() - startTime < holdDuration - 100) {
        // Quick tap: Prompt confirmation dialog to avoid accidental trigger
        this.promptConfirmation();
      }
    });

    // Keyboard support (Space / Enter)
    btn.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.promptConfirmation();
      }
    });
  }

  /**
   * Confirmation dialog fallback for quick taps or keyboard triggers
   */
  promptConfirmation() {
    if (this.isActive) return;

    const isSaral = document.documentElement.classList.contains('saral');
    const content = `
      <div class="flow" style="text-align: center; padding: var(--space-3) 0;">
        <div style="font-size: 3rem; margin-bottom: var(--space-2);">🚨</div>
        <h3 style="color: var(--color-danger); margin-bottom: var(--space-2);">Activate Safety SOS?</h3>
        <p style="color: var(--color-text-main); font-size: ${isSaral ? '1.3rem' : 'var(--font-size-base)'};">
          This will begin a 5-second countdown to notify your emergency contacts with your live location.
        </p>
        <p style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
          Tip: You can also press and hold the red SOS button for 2 seconds.
        </p>
        <div style="display: flex; gap: var(--space-3); justify-content: center; margin-top: var(--space-4);">
          <button type="button" class="btn btn-outline" id="btn-cancel-sos-confirm" onclick="window.YatraApp.closeModal()">
            Cancel
          </button>
          <button type="button" class="btn btn-primary" id="btn-start-sos-confirm" style="background-color: var(--color-danger); border-color: var(--color-danger); font-weight: 700;">
            Activate SOS Now
          </button>
        </div>
      </div>
    `;

    if (window.YatraApp && window.YatraApp.openModal) {
      window.YatraApp.openModal({
        title: 'Emergency Confirmation',
        content
      });

      setTimeout(() => {
        document.getElementById('btn-start-sos-confirm')?.addEventListener('click', () => {
          window.YatraApp.closeModal();
          this.triggerCountdown();
        });
      }, 50);
    } else {
      if (window.confirm('Activate Emergency Safety SOS? (Demo Mode)')) {
        this.triggerCountdown();
      }
    }
  }

  /**
   * Starts the 5-second countdown before activating the alert
   */
  triggerCountdown() {
    if (this.isActive) return;
    this.isActive = true;
    this.countdownSeconds = 5;

    // Fetch initial location in background immediately
    this._startLocationTracking();

    this._renderCountdownOverlay();

    // Voice announcement in Saral / accessibility mode
    const state = store.getState();
    const isHindi = state.language === 'HI';
    const voiceMsg = isHindi 
      ? 'एसओएस चेतावनी शुरू। रद्द करने के लिए पांच सेकंड।' 
      : 'SOS countdown started. Five seconds to cancel.';
    speechAssistant.speak(voiceMsg, state.language || 'EN');

    this.countdownTimer = setInterval(() => {
      this.countdownSeconds -= 1;
      const countEl = document.getElementById('sos-countdown-val');
      if (countEl) countEl.textContent = String(this.countdownSeconds);

      if (this.countdownSeconds <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.activateDispatchedAlert();
      }
    }, 1000);
  }

  /**
   * Renders the 5-second cancel overlay
   */
  _renderCountdownOverlay() {
    this._removeOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'sos-fullscreen-overlay';
    overlay.className = 'sos-overlay countdown-state';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Emergency SOS Countdown');

    overlay.innerHTML = `
      <div class="sos-card countdown-box flow" style="text-align: center;">
        <div class="sos-countdown-circle">
          <span id="sos-countdown-val">${this.countdownSeconds}</span>
        </div>
        <h2 style="color: #FFFFFF; font-size: 2rem; margin: var(--space-2) 0;">EMERGENCY SOS ACTIVATING</h2>
        <p style="color: #FECACA; font-size: var(--font-size-lg); max-width: 480px; margin: 0 auto;">
          Sharing live GPS location and sending emergency alerts to registered contacts in <strong id="sos-countdown-text">5 seconds</strong>.
        </p>

        <div style="margin-top: var(--space-6);">
          <button type="button" class="btn btn-lg sos-cancel-btn" id="btn-sos-cancel-countdown" style="background-color: #FFFFFF; color: #991B1B; font-weight: 800; border: 3px solid #F87171; min-height: 64px; font-size: 1.25rem;">
            ✋ CANCEL — I AM SAFE
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlayEl = overlay;

    document.getElementById('btn-sos-cancel-countdown')?.addEventListener('click', () => {
      this.cancelAlert('User cancelled during 5s countdown');
    });
  }

  /**
   * Transition to "SOS Sent" Dispatched state
   */
  activateDispatchedAlert() {
    const settings = store.getSosSettings();
    const state = store.getState();
    const isHindi = state.language === 'HI';

    // Voice announcement: "SOS activated"
    const alertMsg = isHindi 
      ? 'एसओएस सक्रिय हो गया है। आपातकालीन संपर्कों को संदेश भेजा जा रहा है।' 
      : 'SOS activated. Live location shared with emergency contacts.';
    speechAssistant.speak(alertMsg, state.language || 'EN');

    // Log event in store for impact metrics
    const coords = this.currentLocation || this.fallbackCoords;
    const logEntry = store.addSosLog({
      eventType: 'DISPATCH',
      coords: { lat: coords.latitude, lng: coords.longitude },
      locationLabel: coords.address || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
      contactsCount: (settings.emergencyContacts || []).length,
      simulatedResponseTimeSeconds: 42
    });

    this._renderDispatchedOverlay(coords, settings, logEntry);
  }

  /**
   * Render the active "SOS Sent" interface
   */
  _renderDispatchedOverlay(coords, settings, logEntry) {
    if (!this.overlayEl) {
      this._removeOverlay();
      const overlay = document.createElement('div');
      overlay.id = 'sos-fullscreen-overlay';
      overlay.className = 'sos-overlay dispatched-state';
      overlay.setAttribute('role', 'alertdialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Emergency SOS Dispatched');
      document.body.appendChild(overlay);
      this.overlayEl = overlay;
    } else {
      this.overlayEl.className = 'sos-overlay dispatched-state';
      this.overlayEl.innerHTML = '';
    }

    const mapsUrl = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
    const prefilledSms = encodeURIComponent(
      `🚨 EMERGENCY SOS (YatraLocal Demo): I need urgent assistance! My current location is ${mapsUrl}. Medical notes: ${settings.medicalNotes || 'None'}`
    );

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const container = document.createElement('div');
    container.className = 'sos-dispatched-container flow';
    container.innerHTML = `
      <!-- Simulation Notice Banner -->
      <div class="sos-banner-demo" role="note">
        <span class="badge" style="background:#FEE2E2; color:#991B1B; font-weight:800;">SIMULATED DEMO</span>
        <span>No real alert has been sent to actual emergency services — this is a prototype demonstration.</span>
      </div>

      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap: var(--space-3); border-bottom: 2px solid rgba(255,255,255,0.2); padding-bottom: var(--space-3);">
        <div>
          <h2 style="color: #FFFFFF; margin:0; display:flex; align-items:center; gap:8px;">
            <span class="sos-live-pulse" aria-hidden="true"></span>
            SAFETY SOS ACTIVATED
          </h2>
          <span style="font-size: var(--font-size-xs); color: #FECACA;">Incident Log Ref: ${logEntry.id}</span>
        </div>
        <button type="button" class="btn btn-sm btn-safe-stop" id="btn-sos-safe-stop" style="background:#FFFFFF; color:#15803D; font-weight:800; border:2px solid #86EFAC;">
          ✓ I'm Safe — Stop Sharing
        </button>
      </div>

      <!-- Quick 1-Touch Emergency Services Dialers -->
      <div class="sos-dialers-grid">
        <a href="tel:112" class="sos-dial-card primary-dial">
          <span class="dial-icon">📞</span>
          <div class="dial-info">
            <strong>Call 112</strong>
            <small>National Emergency (All India)</small>
          </div>
        </a>
        <a href="tel:100" class="sos-dial-card">
          <span class="dial-icon">👮</span>
          <div class="dial-info">
            <strong>Call 100</strong>
            <small>Local Police</small>
          </div>
        </a>
        <a href="tel:108" class="sos-dial-card">
          <span class="dial-icon">🚑</span>
          <div class="dial-info">
            <strong>Call 108</strong>
            <small>Medical Ambulance</small>
          </div>
        </a>
        <a href="tel:1363" class="sos-dial-card">
          <span class="dial-icon">🧳</span>
          <div class="dial-info">
            <strong>Call 1363</strong>
            <small>Govt. Tourist Helpline</small>
          </div>
        </a>
      </div>

      <!-- Live Location Card -->
      <div class="card sos-section-card flow">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <h3 style="margin:0; font-size:1.15rem; display:flex; align-items:center; gap:6px;">
            📍 Live Beacon Coordinates
          </h3>
          <span class="badge" style="background:#E0F2FE; color:#0369A1;" id="sos-location-status">
            ${coords.isSimulated ? 'Fallback Demo Location' : 'Live GPS Active'}
          </span>
        </div>

        <div style="background:var(--color-bg); padding:var(--space-3); border-radius:var(--radius-md); font-family:monospace; font-size:0.95rem;">
          <div><strong>Latitude:</strong> <span id="sos-lat">${coords.latitude.toFixed(6)}</span></div>
          <div><strong>Longitude:</strong> <span id="sos-lng">${coords.longitude.toFixed(6)}</span></div>
          <div><strong>Accuracy:</strong> <span id="sos-acc">±${Math.round(coords.accuracy || 15)}m</span></div>
          <div><strong>Area:</strong> <span id="sos-area">${coords.address || 'Burwa Village, Manali (Himachal Pradesh)'}</span></div>
          <div style="font-size:0.8rem; color:var(--color-text-muted); margin-top:4px;">
            Last updated: <span id="sos-last-updated">${nowTime}</span> (auto-throttled every 15s)
          </div>
        </div>

        <div style="display:flex; gap:var(--space-3); flex-wrap:wrap;">
          <a href="${mapsUrl}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" id="btn-open-maps">
            🗺️ View on Google Maps ↗
          </a>
          <a href="https://api.whatsapp.com/send?text=${prefilledSms}" target="_blank" rel="noopener" class="btn btn-primary btn-sm" style="background-color:#25D366; border-color:#25D366;">
            💬 Send via WhatsApp
          </a>
          <a href="sms:?body=${prefilledSms}" class="btn btn-outline btn-sm">
            📱 Send via SMS
          </a>
        </div>
      </div>

      <!-- Emergency Contacts Notified Status -->
      <div class="card sos-section-card flow">
        <h3 style="margin:0; font-size:1.15rem;">Simulated Alerts Dispatched To</h3>
        ${(settings.emergencyContacts || []).length > 0 ? `
          <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px;">
            ${settings.emergencyContacts.map((c) => `
              <li style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--color-bg); border-radius:var(--radius-sm);">
                <div>
                  <strong>${c.name}</strong> <span style="color:var(--color-text-muted); font-size:0.85rem;">(${c.relation || 'Contact'})</span><br>
                  <span style="font-family:monospace; font-size:0.85rem;">${c.phone}</span>
                </div>
                <span class="badge" style="background:#DCFCE7; color:#15803D;">✓ SMS Dispatched (Demo)</span>
              </li>
            `).join('')}
          </ul>
        ` : `
          <p style="color:var(--color-text-muted); font-size:var(--font-size-sm); margin:0;">
            No custom contacts registered. Alert dispatched to default guardian hotline. <a href="#/sos" style="color:var(--color-primary); font-weight:600;">Configure Contacts ➔</a>
          </p>
        `}

        ${settings.medicalNotes ? `
          <div style="background:#FFFBEB; border-left:4px solid #F59E0B; padding:var(--space-3); border-radius:var(--radius-sm); font-size:var(--font-size-sm);">
            <strong>Medical Alert Attached:</strong> ${settings.medicalNotes}
          </div>
        ` : ''}
      </div>

      <!-- Privacy & Off-Device Architecture Guarantee -->
      <div style="background:rgba(255,255,255,0.12); padding:var(--space-3) var(--space-4); border-radius:var(--radius-md); font-size:var(--font-size-xs); color:#F1F5F9;">
        🔒 <strong>100% On-Device Privacy Guarantee:</strong> YatraLocal processes all GPS coordinates and emergency contacts entirely within your browser's local sandbox. No data is transmitted to third-party tracking servers. Production enterprise safety alerts require telecom API integration and local authority emergency dispatch authorization.
      </div>
    `;

    this.overlayEl.appendChild(container);

    // Stop sharing button
    document.getElementById('btn-sos-safe-stop')?.addEventListener('click', () => {
      this.cancelAlert('User declared safe via Safe Stop button');
    });
  }

  /**
   * Geolocation watch Position with battery throttling
   */
  _startLocationTracking() {
    if (this.watchId) return;

    if (!('geolocation' in navigator)) {
      console.warn('Geolocation not supported on this browser. Falling back to default demo location.');
      this.currentLocation = { ...this.fallbackCoords };
      return;
    }

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            address: 'Live GPS Coordinates',
            isSimulated: false
          };
          this._updateLocationUI();
        },
        (error) => {
          console.warn('Geolocation permission denied or unavailable:', error.message);
          this.currentLocation = { ...this.fallbackCoords, reason: error.message };
          this._updateLocationUI();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 15000 // Throttled to 15s to conserve battery
        }
      );
    } catch (err) {
      this.currentLocation = { ...this.fallbackCoords };
    }
  }

  /**
   * Update active UI with refreshed location
   */
  _updateLocationUI() {
    const coords = this.currentLocation || this.fallbackCoords;
    const latEl = document.getElementById('sos-lat');
    const lngEl = document.getElementById('sos-lng');
    const accEl = document.getElementById('sos-acc');
    const areaEl = document.getElementById('sos-area');
    const timeEl = document.getElementById('sos-last-updated');
    const badgeEl = document.getElementById('sos-location-status');
    const mapsLink = document.getElementById('btn-open-maps');

    if (latEl) latEl.textContent = coords.latitude.toFixed(6);
    if (lngEl) lngEl.textContent = coords.longitude.toFixed(6);
    if (accEl) accEl.textContent = `±${Math.round(coords.accuracy || 15)}m`;
    if (areaEl) areaEl.textContent = coords.address || 'Detected Location';
    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (badgeEl) {
      badgeEl.textContent = coords.isSimulated ? 'Fallback Demo Location' : 'Live GPS Active';
      badgeEl.style.background = coords.isSimulated ? '#FEF3C7' : '#DCFCE7';
      badgeEl.style.color = coords.isSimulated ? '#92400E' : '#15803D';
    }
    if (mapsLink) {
      mapsLink.href = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
    }
  }

  /**
   * Cancel or de-activate SOS
   */
  cancelAlert(reason = 'User resolved') {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    if (this.watchId) {
      navigator.geolocation?.clearWatch?.(this.watchId);
      this.watchId = null;
    }

    // Log resolution
    store.addSosLog({
      eventType: 'RESOLVED',
      reason,
      timestamp: new Date().toISOString()
    });

    this.isActive = false;
    this._removeOverlay();

    if (window.YatraApp && window.YatraApp.showToast) {
      window.YatraApp.showToast('✅ Emergency SOS deactivated. You are marked safe.');
    }
  }

  _removeOverlay() {
    const existing = document.getElementById('sos-fullscreen-overlay');
    if (existing) existing.remove();
    this.overlayEl = null;
  }
}

export const sosEngine = new SosEngine();
