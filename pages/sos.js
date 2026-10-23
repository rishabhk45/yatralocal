/**
 * YatraLocal - Emergency SOS Setup & Directory Page (#/sos)
 * 
 * Features:
 * 1. Emergency contacts manager (add/edit up to 3 contacts).
 * 2. Medical notes / allergy conditions editor.
 * 3. Live location sharing preferences.
 * 4. National emergency directory reference (112, 100, 108, 1091, 1363).
 * 5. Safe SOS Drill Trigger to test functionality without panic.
 * 6. Audit log of past simulated SOS incidents and response times.
 */

import { store } from '../js/store.js';
import { sosEngine } from '../js/sos.js';

export function renderSosView() {
  const container = document.createElement('div');
  container.className = 'container sos-setup-container';
  container.style.maxWidth = '900px';
  container.style.margin = '0 auto';
  container.style.padding = 'var(--space-6) var(--space-4) 120px var(--space-4)';

  const settings = store.getSosSettings();
  const contacts = settings.emergencyContacts || [];
  const logs = store.getSosLogs();

  container.innerHTML = `
    <!-- Header -->
    <header class="flow" style="margin-bottom: var(--space-6); text-align: center;">
      <span class="badge" style="background:#FEE2E2; color:#991B1B; font-weight:700;">SAFETY & EMERGENCY DISPATCH</span>
      <h1 style="color: var(--color-danger); margin: var(--space-2) 0;">Emergency SOS Hub</h1>
      <p style="color: var(--color-text-muted); max-width: 620px; margin: 0 auto; font-size: var(--font-size-base);">
        Configure your emergency contacts, medical notes, and test the 2-second press-and-hold trigger. All data remains 100% on-device for total privacy.
      </p>
    </header>

    <!-- Safety & Legal Disclaimer -->
    <div style="background: #FFFBEB; border: 1.5px solid #F59E0B; border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-6); font-size: var(--font-size-xs); color: #92400E; line-height: 1.6;">
      ⚠️ <strong>Important Safety & Legal Disclaimer:</strong> This prototype is not a replacement for official national emergency services. Production deployment requires formal integration, telemetry testing, carrier SMS safeguards, and compliance with local telecommunication regulations. In an immediate life-threatening emergency, always dial <strong>112</strong> directly.
    </div>

    <!-- Quick SOS Test & Drill Banner -->
    <div class="card" style="border: 2px dashed var(--color-danger); background-color: #FEF2F2; margin-bottom: var(--space-4); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-4); padding: var(--space-5);">
      <div>
        <h3 style="color: #991B1B; margin: 0 0 4px 0; font-size: 1.25rem;">🚨 Practice Emergency Drill</h3>
        <p style="color: #7F1D1D; font-size: var(--font-size-sm); margin: 0;">
          Simulate activating the SOS beacon to see exactly what your family and guides receive.
        </p>
      </div>
      <button type="button" class="btn btn-primary" id="btn-trigger-drill" style="background-color: var(--color-danger); border-color: var(--color-danger); font-weight: 700; min-height: 48px;">
        Trigger Practice SOS (5s Countdown)
      </button>
    </div>

    <!-- Send Test Alert to Myself Card -->
    <div class="card" style="border: 1.5px solid #0284C7; background-color: #F0F9FF; margin-bottom: var(--space-6); padding: var(--space-5);">
      <div class="flex-between" style="align-items: center; flex-wrap: wrap; gap: var(--space-3);">
        <div>
          <div class="flex gap-2" style="align-items: center; margin-bottom: 4px;">
            <span class="badge" style="background: #0284C7; color: #FFFFFF; font-weight: 800; font-size: 0.72rem;">TEST ALERT MODE</span>
            <h3 style="color: #0369A1; margin: 0; font-size: 1.15rem;">Send Test Alert to Myself</h3>
          </div>
          <p style="color: #075985; font-size: var(--font-size-xs); margin: 0;">
            Verify delivery of SMS alerts and preview live tracking without panicking your contacts.
          </p>
        </div>
        <div class="flex gap-2" style="align-items: center; flex-wrap: wrap;">
          <input type="tel" id="input-test-phone" placeholder="Your phone (+91...)" value="${contacts[0]?.phone || ''}" style="padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--font-size-xs); min-width: 170px;" />
          <button type="button" class="btn btn-primary btn-sm" id="btn-send-test-alert" style="background-color: #0284C7; border-color: #0284C7; font-weight: 700; min-height: 38px;">
            🧪 Send Test Alert (TEST)
          </button>
        </div>
      </div>
    </div>

    <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-6); align-items: start;">
      
      <!-- Left Column: Contacts & Medical Form -->
      <section class="card flow" aria-labelledby="contacts-heading" style="padding: var(--space-5);">
        <h2 id="contacts-heading" style="font-size: 1.35rem; margin-bottom: var(--space-2);">
          👨‍👩‍👦 Emergency Contacts (Max 3)
        </h2>
        <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: var(--space-4);">
          These contacts receive simulated emergency SMS & WhatsApp location links when you activate SOS.
        </p>

        <!-- Current Contacts List -->
        <div id="contacts-list" class="flow" style="margin-bottom: var(--space-4);">
          ${contacts.map((c, idx) => `
            <div class="card" style="padding: var(--space-3) var(--space-4); background-color: var(--color-bg); display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--color-border);">
              <div>
                <strong style="color: var(--color-text-main);">${c.name}</strong> 
                <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">(${c.relation})</span>
                <div style="font-family: monospace; font-size: var(--font-size-xs); color: var(--color-primary);">${c.phone}</div>
              </div>
              <button type="button" class="btn btn-outline btn-sm btn-delete-contact" data-idx="${idx}" style="color: var(--color-danger); border-color: #FCA5A5; padding: 4px 10px;" aria-label="Remove ${c.name}">
                Remove
              </button>
            </div>
          `).join('')}
        </div>

        ${contacts.length < 3 ? `
          <!-- Add Contact Inline Form -->
          <form id="add-contact-form" class="flow" style="background: var(--color-bg-surface); border: 2px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4);">
            <h4 style="margin: 0 0 var(--space-2) 0; font-size: 1rem;">+ Add New Emergency Contact</h4>
            <div>
              <label for="contact-name" style="font-size: var(--font-size-xs); font-weight: 600;">Full Name *</label>
              <input type="text" id="contact-name" required placeholder="e.g. Ramesh Uncle" style="width: 100%; margin-top: 4px; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);" />
            </div>
            <div class="grid" style="grid-template-columns: 1fr 1fr; gap: var(--space-3);">
              <div>
                <label for="contact-relation" style="font-size: var(--font-size-xs); font-weight: 600;">Relationship</label>
                <input type="text" id="contact-relation" placeholder="e.g. Daughter" style="width: 100%; margin-top: 4px; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);" />
              </div>
              <div>
                <label for="contact-phone" style="font-size: var(--font-size-xs); font-weight: 600;">Phone Number *</label>
                <input type="tel" id="contact-phone" required placeholder="+91 98765 00000" style="width: 100%; margin-top: 4px; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);" />
              </div>
            </div>
            <button type="submit" class="btn btn-outline btn-sm" style="width: 100%; margin-top: var(--space-2); font-weight: 600;">
              Save Contact
            </button>
          </form>
        ` : `
          <div style="background-color: var(--color-bg-subtle); padding: var(--space-3); border-radius: var(--radius-sm); font-size: var(--font-size-xs); color: var(--color-text-muted);">
            Maximum 3 emergency contacts reached. Remove one above to replace.
          </div>
        `}

        <hr style="border: none; border-top: 1px solid var(--color-border); margin: var(--space-5) 0;">

        <!-- Medical & Health Notes -->
        <div>
          <label for="medical-notes-input" style="font-weight: 700; font-size: 1.1rem; display: block; margin-bottom: 4px;">
            🩺 Medical Conditions & Notes
          </label>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: var(--space-2);">
            Included with distress beacons (e.g. allergies, diabetic condition, blood pressure medications, pacemaker).
          </p>
          <textarea id="medical-notes-input" rows="3" style="width: 100%; padding: 10px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--font-size-sm);">${settings.medicalNotes || ''}</textarea>
          <button type="button" class="btn btn-primary btn-sm" id="btn-save-medical" style="margin-top: var(--space-2);">
            Save Medical Notes
          </button>
        </div>

        <!-- Live Location Switch -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) 0; border-top: 1px solid var(--color-border); margin-top: var(--space-4);">
          <div>
            <strong>Broadcast Live GPS Coordinates</strong>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0;">
              Throttled to conserve mobile battery while in remote terrain
            </p>
          </div>
          <input type="checkbox" id="chk-share-gps" ${settings.shareLiveLocation !== false ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;" aria-label="Broadcast Live GPS Coordinates" />
        </div>

        <!-- Explicit Consent Checkbox -->
        <div style="display: flex; align-items: flex-start; gap: var(--space-2); padding: var(--space-3) 0; border-top: 1px solid var(--color-border); margin-top: var(--space-2);">
          <input type="checkbox" id="chk-sos-consent" checked style="width: 20px; height: 20px; margin-top: 2px; cursor: pointer;" />
          <label for="chk-sos-consent" style="font-size: var(--font-size-xs); color: var(--color-text-main); cursor: pointer;">
            <strong>Explicit Consent:</strong> I authorize YatraLocal to broadcast my live GPS coordinates and medical details to my emergency contacts during an active SOS.
          </label>
        </div>
      </section>

      <!-- Right Column: Official Helplines & Incident Audit Logs -->
      <div class="flow">
        
        <!-- National Helpline Directory -->
        <section class="card flow" aria-labelledby="directory-heading" style="padding: var(--space-5);">
          <h2 id="directory-heading" style="font-size: 1.35rem; margin-bottom: var(--space-2);">
            📞 Official Emergency Directory
          </h2>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: var(--space-3);">
            Direct, toll-free government hotlines active 24x7 across all Indian states and Union Territories.
          </p>

          <div class="flow" style="gap: var(--space-2);">
            <a href="tel:112" class="sos-dial-card primary-dial" style="border: 2px solid #FCA5A5; background: #FEF2F2; text-decoration: none; padding: 12px; border-radius: var(--radius-md); display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 2rem;">🚨</span>
              <div style="flex-grow: 1;">
                <strong style="color: #991B1B; font-size: 1.15rem;">112 — National Emergency Service</strong>
                <div style="font-size: var(--font-size-xs); color: #7F1D1D;">All-in-one Police, Fire & Disaster response in India</div>
              </div>
              <span class="badge" style="background:#991B1B; color:#FFFFFF;">Call Now ➔</span>
            </a>

            <a href="tel:100" class="sos-dial-card" style="border: 1px solid var(--color-border); background: var(--color-bg-surface); text-decoration: none; padding: 10px 14px; border-radius: var(--radius-md); display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.6rem;">👮</span>
              <div style="flex-grow: 1;">
                <strong>100 — Local Police Control Room</strong>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Immediate law enforcement dispatch</div>
              </div>
              <span style="font-size: var(--font-size-xs); color: var(--color-primary); font-weight: 600;">tel:100</span>
            </a>

            <a href="tel:108" class="sos-dial-card" style="border: 1px solid var(--color-border); background: var(--color-bg-surface); text-decoration: none; padding: 10px 14px; border-radius: var(--radius-md); display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.6rem;">🚑</span>
              <div style="flex-grow: 1;">
                <strong>108 — National Ambulance Hotline</strong>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Medical emergency response & EMT transport</div>
              </div>
              <span style="font-size: var(--font-size-xs); color: var(--color-primary); font-weight: 600;">tel:108</span>
            </a>

            <a href="tel:1091" class="sos-dial-card" style="border: 1px solid var(--color-border); background: var(--color-bg-surface); text-decoration: none; padding: 10px 14px; border-radius: var(--radius-md); display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.6rem;">🛡️</span>
              <div style="flex-grow: 1;">
                <strong>1091 — Women Helpline</strong>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">24x7 safety assistance for female travellers</div>
              </div>
              <span style="font-size: var(--font-size-xs); color: var(--color-primary); font-weight: 600;">tel:1091</span>
            </a>

            <a href="tel:1363" class="sos-dial-card" style="border: 1px solid var(--color-border); background: var(--color-bg-surface); text-decoration: none; padding: 10px 14px; border-radius: var(--radius-md); display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.6rem;">🧳</span>
              <div style="flex-grow: 1;">
                <strong>1363 — Ministry of Tourism Helpline</strong>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Multi-lingual tourist support (12 languages)</div>
              </div>
              <span style="font-size: var(--font-size-xs); color: var(--color-primary); font-weight: 600;">tel:1363</span>
            </a>
          </div>
        </section>

        <!-- SOS Incident Log & Response Time Simulation -->
        <section class="card flow" aria-labelledby="log-heading" style="padding: var(--space-5);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2 id="log-heading" style="font-size: 1.25rem; margin: 0;">
              📋 Emergency Audit Log
            </h2>
            <span class="badge badge-demo">Simulated Response Time</span>
          </div>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0;">
            Logged events feed into our platform safety dashboard to measure mean response time.
          </p>

          <div id="sos-audit-table" style="max-height: 240px; overflow-y: auto; margin-top: var(--space-3);">
            ${logs.length > 0 ? `
              <table style="width: 100%; border-collapse: collapse; font-size: var(--font-size-xs);">
                <thead>
                  <tr style="border-bottom: 2px solid var(--color-border); text-align: left; color: var(--color-text-muted);">
                    <th style="padding: 6px 4px;">Time</th>
                    <th style="padding: 6px 4px;">Event</th>
                    <th style="padding: 6px 4px;">Location</th>
                    <th style="padding: 6px 4px;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${logs.map((l) => `
                    <tr style="border-bottom: 1px solid var(--color-border);">
                      <td style="padding: 6px 4px; font-family: monospace;">${new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style="padding: 6px 4px;"><strong>${l.eventType}</strong></td>
                      <td style="padding: 6px 4px; color: var(--color-text-muted);">${l.locationLabel || 'Simulated Area'}</td>
                      <td style="padding: 6px 4px;">
                        <span class="badge" style="background:${l.eventType === 'DISPATCH' ? '#FEE2E2' : '#DCFCE7'}; color:${l.eventType === 'DISPATCH' ? '#991B1B' : '#166534'};">
                          ${l.eventType === 'DISPATCH' ? 'Alert Sent' : 'Resolved'}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div style="text-align: center; padding: var(--space-4); color: var(--color-text-muted); font-size: var(--font-size-xs); background: var(--color-bg); border-radius: var(--radius-sm);">
                No emergency events recorded yet. Trigger a drill above to test tracking.
              </div>
            `}
          </div>
        </section>

      </div>
    </div>

    <!-- Privacy Architecture Notice -->
    <footer style="margin-top: var(--space-8); padding: var(--space-4); background-color: var(--color-bg-subtle); border-radius: var(--radius-md); font-size: var(--font-size-xs); color: var(--color-text-muted); text-align: center;">
      🔒 <strong>Privacy & Architecture Note:</strong> YatraLocal uses on-device Web APIs (HTML5 Geolocation and Web Speech). Your medical information and emergency contacts are never sold or sent to remote servers without explicit manual action. Production deployments require carrier SMS gateway integration.
    </footer>
  `;

  // Attach event handlers
  setTimeout(() => {
    // Trigger drill button
    container.querySelector('#btn-trigger-drill')?.addEventListener('click', () => {
      sosEngine.triggerCountdown();
    });

    // Delete contact buttons
    container.querySelectorAll('.btn-delete-contact').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        const currentContacts = [...(store.getSosSettings().emergencyContacts || [])];
        currentContacts.splice(idx, 1);
        store.updateSosSettings({ emergencyContacts: currentContacts });
        window.YatraApp.showToast('Emergency contact removed.');
        // Re-render view
        const parent = container.parentElement;
        if (parent) {
          parent.innerHTML = '';
          parent.appendChild(renderSosView());
        }
      });
    });

    // Add contact form
    const addForm = container.querySelector('#add-contact-form');
    addForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = container.querySelector('#contact-name').value.trim();
      const relation = container.querySelector('#contact-relation').value.trim() || 'Emergency Contact';
      const phone = container.querySelector('#contact-phone').value.trim();

      if (!name || !phone) return;

      const currentContacts = [...(store.getSosSettings().emergencyContacts || [])];
      currentContacts.push({
        id: `c_${Date.now()}`,
        name,
        relation,
        phone
      });

      store.updateSosSettings({ emergencyContacts: currentContacts });
      window.YatraApp.showToast(`Saved ${name} as emergency contact.`);

      const parent = container.parentElement;
      if (parent) {
        parent.innerHTML = '';
        parent.appendChild(renderSosView());
      }
    });

    // Save medical notes button
    container.querySelector('#btn-save-medical')?.addEventListener('click', () => {
      const notes = container.querySelector('#medical-notes-input').value.trim();
      store.updateSosSettings({ medicalNotes: notes });
      window.YatraApp.showToast('Medical conditions updated.');
    });

    // Live GPS checkbox
    container.querySelector('#chk-share-gps')?.addEventListener('change', (e) => {
      store.updateSosSettings({ shareLiveLocation: e.target.checked });
      window.YatraApp.showToast(`Live GPS sharing ${e.target.checked ? 'enabled' : 'disabled'}.`);
    });

    // Consent checkbox
    container.querySelector('#chk-sos-consent')?.addEventListener('change', (e) => {
      try {
        localStorage.setItem('yatralocal_sos_consent', String(e.target.checked));
      } catch (_) {}
      window.YatraApp.showToast(`Location sharing consent ${e.target.checked ? 'granted' : 'withdrawn'}.`);
    });

    // Send Test Alert button
    container.querySelector('#btn-send-test-alert')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const phoneInput = container.querySelector('#input-test-phone');
      const testPhone = phoneInput?.value.trim() || '+91 98765 43210';

      btn.disabled = true;
      btn.textContent = '⏳ Dispatching Test...';

      try {
        const result = await sosEngine.sendTestAlert(testPhone);
        if (result.smsDispatched) {
          window.YatraApp.showToast(`✓ Test alert dispatched via Twilio SMS to ${testPhone}!`);
        } else {
          window.YatraApp.showToast(`Test generated! Live tracking preview link: ${result.trackingUrl}`);
          if (result.trackingUrl) {
            window.open(result.trackingUrl, '_blank');
          }
        }
      } catch (err) {
        window.YatraApp.showToast(`Test error: ${err.message}`, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '🧪 Send Test Alert (TEST)';
      }
    });
  }, 0);

  return container;
}
