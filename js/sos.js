/**
 * YatraLocal - Emergency Safety SOS Engine (/js/sos.js)
 * Phase 18: Real SOS via Twilio (SMS + WhatsApp) with Live Location
 * 
 * Capabilities:
 * 1. Global press-and-hold trigger (2s progress ring) + 5s countdown overlay with sound/voice.
 * 2. High-accuracy geolocation capture (getCurrentPosition with enableHighAccuracy: true, timeout: 10000)
 *    and watchPosition throttled to 15 seconds.
 * 3. Clear handling for all location errors (permission denied, position unavailable, timeout, insecure context).
 * 4. Normalizes phone numbers to E.164 (+91 default for 10-digit Indian numbers).
 * 5. Dispatches real alerts via Twilio (SMS or WhatsApp) via /.netlify/functions/sos.
 * 6. Honest on-screen reporting of real server dispatch results (sent, failed, error code). Zero fake success.
 * 7. Zero-backend native fallback: tel:112, prefilled sms: and https://wa.me/ links with location pre-typed.
 * 8. Live family tracking link (/track.html?id=TOKEN) with 6-hour expiration.
 */

import { store } from './store.js';
import { speechAssistant } from './speech.js';

/**
 * Normalizes phone numbers to E.164 format
 * Defaults 10-digit Indian numbers to +91
 */
export function normalizeToE164(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const clean = phone.replace(/[\s\-\(\)\.]/g, '').trim();
  if (!clean) return null;

  // 10-digit Indian number without country code
  if (/^\d{10}$/.test(clean)) {
    return `+91${clean}`;
  }
  // Leading 0 + 10-digit Indian number (e.g. 09876543210)
  if (/^0\d{10}$/.test(clean)) {
    return `+91${clean.slice(1)}`;
  }
  // Standard E.164 with leading +
  if (/^\+[1-9]\d{7,14}$/.test(clean)) {
    return clean;
  }
  return null;
}

/**
 * Mask phone numbers for display (+91 98*** **210)
 */
export function maskPhone(phone) {
  if (!phone) return '***';
  const clean = String(phone).trim();
  if (clean.length <= 6) return '***' + clean.slice(-2);
  return `${clean.slice(0, 5)}*** **${clean.slice(-3)}`;
}

class SosEngine {
  constructor() {
    this.countdownSeconds = 5;
    this.countdownTimer = null;
    this.watchId = null;
    this.currentLocation = null;
    this.locationErrorReason = null;
    this.isActive = false;
    this.overlayEl = null;
    this.activeToken = null;
    this.lastPostTime = 0;
    const settings = store.getSosSettings ? store.getSosSettings() : {};
    this.preferredChannel = settings.channel || 'sms'; // 'sms' | 'whatsapp'
  }

  /**
   * Setup global trigger on the floating button (#global-sos-btn)
   */
  initGlobalButton(btnSelector = '#global-sos-btn') {
    if (typeof document === 'undefined') return;
    const btn = document.querySelector(btnSelector);
    if (!btn) return;

    let holdDuration = 2000; // 2 seconds
    let startTime = 0;
    let animFrame = null;

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

    const cleanHold = () => {
      btn.classList.remove('holding');
      if (animFrame) cancelAnimationFrame(animFrame);
      if (ringBar) ringBar.style.strokeDashoffset = '113.1';
    };

    const startHold = (e) => {
      if (this.isActive) return;
      startTime = Date.now();
      btn.classList.add('holding');

      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / holdDuration);
        if (ringBar) {
          ringBar.style.strokeDashoffset = String(113.1 * (1 - progress));
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

    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      startHold(e);
    });
    btn.addEventListener('pointerup', cleanHold);
    btn.addEventListener('pointerleave', cleanHold);
    btn.addEventListener('pointercancel', cleanHold);

    btn.addEventListener('click', () => {
      if (!this.isActive && Date.now() - startTime < 1800) {
        this.openFallbackConfirmModal();
      }
    });
  }

  openFallbackConfirmModal() {
    const content = `
      <div class="flow" style="text-align: center; padding: var(--space-4);">
        <div style="font-size: 3rem; margin-bottom: var(--space-2);">🚨</div>
        <h3 style="color: var(--color-danger); margin: 0;">Activate Emergency SOS?</h3>
        <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin: var(--space-3) 0;">
          This will broadcast your high-accuracy GPS coordinates to your registered emergency contacts via Twilio and generate a live family tracking link.
        </p>
        <div class="flex gap-3" style="justify-content: center; margin-top: var(--space-4);">
          <button type="button" class="btn btn-primary" id="btn-start-sos-confirm" style="background-color: var(--color-danger); border-color: var(--color-danger); font-weight: 700;">
            Yes, Activate SOS
          </button>
          <button type="button" class="btn btn-outline" onclick="window.YatraApp.closeModal()">
            Cancel
          </button>
        </div>
      </div>
    `;

    if (window.YatraApp && window.YatraApp.openModal) {
      window.YatraApp.openModal({ title: 'Emergency Safety SOS', content });
      setTimeout(() => {
        document.getElementById('btn-start-sos-confirm')?.addEventListener('click', () => {
          window.YatraApp.closeModal();
          this.triggerCountdown();
        });
      }, 50);
    } else {
      if (window.confirm('Activate Emergency Safety SOS?')) {
        this.triggerCountdown();
      }
    }
  }

  /**
   * Starts the 5-second countdown with high-accuracy GPS acquisition
   */
  triggerCountdown() {
    if (this.isActive) return;
    this.isActive = true;
    this.countdownSeconds = 5;
    this.locationErrorReason = null;

    // Start high-accuracy geolocation immediately
    this._captureHighAccuracyLocation();

    this._renderCountdownOverlay();

    // Voice announcement
    const state = store.getState();
    const isHindi = state.language === 'HI';
    const voiceMsg = isHindi 
      ? 'एसओएस चेतावनी शुरू। रद्द करने के लिए पांच सेकंड।' 
      : 'SOS countdown activated. Five seconds to cancel.';
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

  cancelCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this._stopLocationTracking();
    this.isActive = false;
    this._removeOverlay();
    speechAssistant.speak('SOS cancelled. You are safe.');
    window.YatraApp?.showToast('SOS cancelled.');
  }

  /**
   * High-Accuracy Geolocation Acquisition
   */
  _captureHighAccuracyLocation() {
    if (typeof window === 'undefined') return;

    // Check secure context
    if (window.isSecureContext === false) {
      this.locationErrorReason = 'Insecure context: Geolocation requires HTTPS.';
    }

    if (!('geolocation' in navigator)) {
      this.locationErrorReason = 'Geolocation API not supported by this browser.';
      return;
    }

    // High accuracy single fix
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.currentLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 15,
          timestamp: pos.timestamp || Date.now()
        };
        this.locationErrorReason = null;
      },
      (err) => {
        switch (err.code) {
          case 1:
            this.locationErrorReason = 'Permission denied: Location access blocked by user/browser.';
            break;
          case 2:
            this.locationErrorReason = 'Position unavailable: GPS signal weak or device offline.';
            break;
          case 3:
            this.locationErrorReason = 'Timeout: GPS request timed out after 10s.';
            break;
          default:
            this.locationErrorReason = err.message || 'Unable to retrieve location coordinates.';
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    // Watch position throttled to 15s
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - this.lastPostTime > 14000) {
          this.lastPostTime = now;
          this.currentLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 15,
            timestamp: pos.timestamp || Date.now()
          };
          this._postLocationUpdate();
        }
      },
      (err) => {
        console.warn('[SOS GPS Watch] Update notice:', err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }
    );
  }

  _stopLocationTracking() {
    if (this.watchId != null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Activates and sends the real alert to server
   */
  async activateDispatchedAlert() {
    const settings = store.getSosSettings();
    const contacts = (settings.emergencyContacts || []).map(c => ({
      name: c.name,
      phone: normalizeToE164(c.phone)
    })).filter(c => Boolean(c.phone));

    const travellerName = store.getState().currentUser?.name || 'A YatraLocal Traveller';
    const channel = settings.channel || this.preferredChannel || 'sms';

    // Show loading state in overlay
    this._renderDispatchedOverlayLoading(contacts, channel);

    const payload = {
      action: 'dispatch',
      travellerName,
      contacts,
      channel,
      lat: this.currentLocation ? this.currentLocation.latitude : null,
      lng: this.currentLocation ? this.currentLocation.longitude : null,
      accuracy: this.currentLocation ? Math.round(this.currentLocation.accuracy) : null,
      timestamp: Date.now()
    };

    let serverResult = null;
    const endpoints = ['/.netlify/functions/sos', '/api/sos'];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          serverResult = await res.json();
          break;
        }
      } catch (err) {
        console.warn(`[SOS] Endpoint ${ep} unreachable:`, err.message);
      }
    }

    if (!serverResult) {
      serverResult = {
        success: false,
        isRealSend: false,
        channel,
        messageText: `SOS from ${travellerName}. Location: ${this.currentLocation ? `https://www.google.com/maps?q=${this.currentLocation.latitude},${this.currentLocation.longitude}` : 'Location not available'}`,
        mapsLink: this.currentLocation ? `https://www.google.com/maps?q=${this.currentLocation.latitude},${this.currentLocation.longitude}` : null,
        results: contacts.map(c => ({
          to: maskPhone(c.phone),
          channel,
          status: 'failed',
          errorMessage: 'Serverless dispatch endpoint unreachable. Use direct phone fallback below.'
        }))
      };
    }

    this.activeToken = serverResult.trackingToken || null;
    this._renderDispatchedOverlay(serverResult, payload);
  }

  _renderCountdownOverlay() {
    this._removeOverlay();

    const settings = store.getSosSettings();
    const contacts = settings.emergencyContacts || [];

    const overlay = document.createElement('div');
    overlay.id = 'sos-fullscreen-overlay';
    overlay.className = 'sos-overlay countdown-state';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Emergency SOS Countdown');

    overlay.innerHTML = `
      <div class="sos-card countdown-box flow" style="text-align: center; max-width: 580px; width: 90%;">
        <div class="sos-countdown-circle">
          <span id="sos-countdown-val">${this.countdownSeconds}</span>
        </div>
        <h2 style="color: #FFFFFF; font-size: 2rem; margin: var(--space-2) 0;">EMERGENCY SOS ACTIVATING</h2>
        <p style="color: #FECACA; font-size: var(--font-size-base); max-width: 480px; margin: 0 auto;">
          Broadcasting live GPS coordinates & dispatching alerts in <strong id="sos-countdown-text">5 seconds</strong>.
        </p>

        <div style="background: rgba(0, 0, 0, 0.35); border-radius: 8px; padding: 10px 14px; margin: 16px auto; text-align: left; max-width: 440px; border: 1px solid rgba(255,255,255,0.2);">
          <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: #FECACA; font-weight: 700; margin-bottom: 6px;">
            🚨 Alerting Contacts:
          </div>
          ${contacts.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${contacts.map(c => `
                <div style="font-size: 0.9rem; color: #FFFFFF; display: flex; justify-content: space-between;">
                  <span><strong>${c.name}</strong> (${c.relation || 'Contact'})</span>
                  <span style="font-family: monospace; color: #FED7AA;">${maskPhone(c.phone)}</span>
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="color: #FCA5A5; font-size: 0.85rem;">No contacts saved. Alert will offer 112 direct call.</div>
          `}
        </div>

        <button type="button" id="btn-cancel-sos" class="btn btn-cancel-sos" style="width: 100%; max-width: 440px; padding: var(--space-4); font-size: 1.25rem; font-weight: 800; border-radius: 9999px; margin-top: var(--space-4);">
          ✋ CANCEL — I AM SAFE
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlayEl = overlay;

    const cancelBtn = overlay.querySelector('#btn-cancel-sos');
    cancelBtn.addEventListener('click', () => this.cancelCountdown());
    cancelBtn.focus();
  }

  _renderDispatchedOverlayLoading(contacts, channel) {
    if (!this.overlayEl) return;
    this.overlayEl.innerHTML = `
      <div class="sos-card flow" style="text-align: center; max-width: 580px; width: 90%; background: #1E293B; color: white; padding: 32px; border-radius: 12px;">
        <div class="skeleton skeleton-rect" style="height: 60px; margin-bottom: 16px;"></div>
        <h2 style="margin: 0; color: #FCA5A5;">📡 Dispatching ${channel.toUpperCase()} Alert via Twilio...</h2>
        <p style="color: #CBD5E1; font-size: 0.9rem; margin-top: 8px;">
          Acquiring high-accuracy GPS fix and transmitting to your emergency contacts.
        </p>
      </div>
    `;
  }

  _renderDispatchedOverlay(serverResult, payload) {
    if (!this.overlayEl) return;

    const coords = this.currentLocation;
    const hasCoords = Boolean(coords);
    const mapsUrl = hasCoords 
      ? `https://www.google.com/maps?q=${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}`
      : null;

    const isAllSent = serverResult.success && serverResult.results && serverResult.results.every(r => r.status === 'sent');
    const isAnySent = serverResult.results && serverResult.results.some(r => r.status === 'sent');
    const trackingUrl = serverResult.trackingUrl ? `${window.location.origin}${serverResult.trackingUrl}` : null;

    // Prefilled native SMS / WhatsApp message
    const alertMessageText = `🚨 EMERGENCY SOS: I need urgent assistance! Last location: ${mapsUrl || 'Location unavailable'} | Medical note: ${store.getSosSettings().medicalNotes || 'None'}`;
    const prefilledEncoded = encodeURIComponent(alertMessageText);

    this.overlayEl.innerHTML = `
      <div class="sos-card flow" style="max-width: 680px; width: 92%; background: #0F172A; color: white; padding: 24px; border-radius: 14px; max-height: 90vh; overflow-y: auto;">
        
        <!-- Status Banner -->
        <div style="background: ${isAllSent ? '#064E3B' : (isAnySent ? '#78350F' : '#7F1D1D')}; border: 1.5px solid ${isAllSent ? '#10B981' : (isAnySent ? '#F59E0B' : '#EF4444')}; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <strong style="font-size: 1.1rem; color: #FFFFFF;">
              ${isAllSent ? '✓ REAL TWILIO ALERT DELIVERED' : (isAnySent ? '⚠️ PARTIAL DELIVERY' : '❌ ALERT NOT DELIVERED VIA SERVER')}
            </strong>
            <span class="badge" style="background: rgba(255,255,255,0.2); color: white; font-size: 0.75rem;">
              ${(serverResult.channel || 'SMS').toUpperCase()} CHANNEL
            </span>
          </div>
          <p style="margin: 4px 0 0; font-size: 0.85rem; color: #F1F5F9;">
            ${isAllSent 
              ? 'Real alerts dispatched successfully to all contacts with live coordinates.' 
              : 'Server dispatch encountered errors. Use the direct phone fallback links below.'}
          </p>
        </div>

        <!-- Header Row -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; border-bottom: 1px solid #334155; padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <h2 style="margin: 0; color: #EF4444; font-size: 1.5rem; display: flex; align-items: center; gap: 8px;">
              <span class="sos-pulse-dot" style="display: inline-block; width: 12px; height: 12px; background: #EF4444; border-radius: 9999px;"></span>
              SAFETY SOS ACTIVATED
            </h2>
            <div style="font-size: 0.8rem; color: #94A3B8; margin-top: 2px;">
              ${serverResult.timeIST || new Date().toLocaleTimeString()}
            </div>
          </div>
          <button type="button" id="btn-sos-safe-stop" class="btn btn-outline" style="background: #FFFFFF; color: #15803D; font-weight: bold; border-color: #86EFAC;">
            ✓ I'm Safe — Stop Sharing
          </button>
        </div>

        <!-- Geolocation Status -->
        <div style="background: #1E293B; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 0.85rem;">
          <strong style="color: #38BDF8;">📍 Geolocation Fix:</strong>
          ${hasCoords ? `
            <div style="margin-top: 4px; color: #E2E8F0;">
              Coordinates: <span style="font-family: monospace;">${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}</span> 
              (accuracy ~${Math.round(coords.accuracy)} m)
            </div>
            <div style="margin-top: 6px;">
              <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="color: #60A5FA; text-decoration: underline; font-weight: bold;">
                Open in Google Maps ↗
              </a>
            </div>
          ` : `
            <div style="margin-top: 4px; color: #FCA5A5;">
              ⚠️ Location Unavailable: ${this.locationErrorReason || 'GPS signal could not be acquired.'}
            </div>
          `}
        </div>

        <!-- Per-Contact Dispatch Log -->
        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.85rem; font-weight: bold; color: #94A3B8; margin-bottom: 8px;">
            DISPATCH RESULTS PER CONTACT:
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${(serverResult.results || []).map(r => `
              <div style="background: #1E293B; border-left: 4px solid ${r.status === 'sent' ? '#10B981' : '#EF4444'}; border-radius: 4px; padding: 8px 12px; font-size: 0.85rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span><strong>${r.to}</strong> (${r.channel})</span>
                  <span class="badge" style="background: ${r.status === 'sent' ? '#065F46' : '#991B1B'}; color: white; font-size: 0.7rem;">
                    ${r.status.toUpperCase()}
                  </span>
                </div>
                ${r.status === 'sent' ? `
                  <div style="font-family: monospace; font-size: 0.72rem; color: #6EE7B7; margin-top: 2px;">Twilio SID: ${r.sid}</div>
                ` : `
                  <div style="color: #FCA5A5; font-size: 0.78rem; margin-top: 2px;">${r.errorMessage}</div>
                `}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Live Family Tracking Link (6h) -->
        ${trackingUrl ? `
          <div style="background: #1E293B; border: 1.5px solid #38BDF8; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
            <strong style="color: #38BDF8; display: block; margin-bottom: 4px;">🔗 Family Live Tracking Link (Expires in 6h):</strong>
            <div style="font-family: monospace; font-size: 0.78rem; color: #BAE6FD; word-break: break-all; margin-bottom: 8px;">
              ${trackingUrl}
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <a href="${trackingUrl}" target="_blank" class="btn btn-outline btn-sm" style="color: white; border-color: #38BDF8; font-size: 0.75rem;">
                Preview Beacon ↗
              </a>
              <button type="button" class="btn btn-primary btn-sm" id="btn-copy-sos-link" style="font-size: 0.75rem;">
                📋 Copy Link
              </button>
            </div>
          </div>
        ` : ''}

        <!-- Zero-Backend Native Fallback Direct Actions -->
        <div style="background: rgba(239, 68, 68, 0.15); border: 1.5px solid #EF4444; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
          <strong style="color: #FCA5A5; font-size: 0.95rem; display: block; margin-bottom: 6px;">
            ⚡ Direct Phone Fallback (Works Without Server):
          </strong>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px;">
            <a href="tel:112" class="btn btn-primary" style="background: #DC2626; border-color: #DC2626; font-weight: bold; text-align: center; justify-content: center;">
              📞 Call 112 (National Helpline)
            </a>
            ${payload.contacts.map(c => `
              <a href="sms:${c.phone}?body=${prefilledEncoded}" class="btn btn-outline btn-sm" style="color: white; border-color: #F87171; text-align: center; justify-content: center;">
                💬 SMS ${c.name || maskPhone(c.phone)}
              </a>
              <a href="https://wa.me/${c.phone.replace('+', '')}?text=${prefilledEncoded}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="color: white; border-color: #34D399; text-align: center; justify-content: center;">
                🟢 WhatsApp ${c.name || maskPhone(c.phone)}
              </a>
            `).join('')}
          </div>
        </div>

        <div style="font-size: 0.75rem; color: #94A3B8; text-align: center;">
          Prototype emergency alert. For real crises, always contact 112 directly.
        </div>
      </div>
    `;

    // Bind Stop Sharing & Copy Buttons
    const stopBtn = this.overlayEl.querySelector('#btn-sos-safe-stop');
    stopBtn?.addEventListener('click', () => this.deactivateAlert());

    const copyBtn = this.overlayEl.querySelector('#btn-copy-sos-link');
    copyBtn?.addEventListener('click', () => {
      if (trackingUrl && navigator.clipboard) {
        navigator.clipboard.writeText(trackingUrl);
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => { copyBtn.textContent = '📋 Copy Link'; }, 2000);
      }
    });
  }

  async _postLocationUpdate() {
    if (!this.activeToken || !this.currentLocation) return;
    try {
      await fetch('/.netlify/functions/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_location',
          token: this.activeToken,
          lat: this.currentLocation.latitude,
          lng: this.currentLocation.longitude,
          accuracy: this.currentLocation.accuracy
        })
      });
    } catch (_) {}
  }

  async deactivateAlert() {
    this._stopLocationTracking();
    if (this.activeToken) {
      try {
        await fetch('/.netlify/functions/sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_location',
            token: this.activeToken,
            status: 'SAFE'
          })
        });
      } catch (_) {}
    }

    this.isActive = false;
    this.activeToken = null;
    this._removeOverlay();
    speechAssistant.speak('Emergency alert deactivated. You are marked safe.');
    window.YatraApp?.showToast('SOS Deactivated: Marked safe.');
  }

  async sendTestAlert(rawPhone, channel = 'sms') {
    const phone = normalizeToE164(rawPhone);
    if (!phone) {
      throw new Error('Please enter a valid 10-digit Indian phone number or international number in E.164 format (e.g. +919876543210).');
    }

    const payload = {
      action: 'dispatch',
      travellerName: 'YatraLocal Tester',
      channel: channel || 'sms',
      contacts: [{ name: 'Myself (Test)', phone }],
      lat: this.currentLocation ? this.currentLocation.latitude : null,
      lng: this.currentLocation ? this.currentLocation.longitude : null,
      accuracy: this.currentLocation ? Math.round(this.currentLocation.accuracy) : null,
      timestamp: Date.now()
    };

    let serverResult = null;
    const endpoints = ['/.netlify/functions/sos', '/api/sos'];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          serverResult = await res.json();
          break;
        }
      } catch (err) {
        console.warn(`[SOS Test] Endpoint ${ep} unreachable:`, err.message);
      }
    }

    if (!serverResult) {
      return {
        success: false,
        isRealSend: false,
        smsDispatched: false,
        trackingUrl: null,
        message: 'Could not connect to serverless SOS function.'
      };
    }

    const firstResult = serverResult.results && serverResult.results[0];
    const smsDispatched = firstResult && firstResult.status === 'sent';

    return {
      success: serverResult.success,
      isRealSend: serverResult.isRealSend,
      smsDispatched,
      channel: serverResult.channel,
      trackingUrl: serverResult.trackingUrl ? `${window.location.origin}${serverResult.trackingUrl}` : null,
      result: firstResult,
      raw: serverResult
    };
  }

  _removeOverlay() {
    const existing = document.getElementById('sos-fullscreen-overlay');
    if (existing) existing.remove();
    this.overlayEl = null;
  }
}

export const sosEngine = new SosEngine();
