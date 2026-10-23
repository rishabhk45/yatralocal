/**
 * YatraLocal - Booking Flow & Family-Assisted Travel (#/booking)
 * 
 * 5-Step Stepper:
 * 1. Review Trip (Itinerary, chosen stay & guide, 90% local-income retention message)
 * 2. Traveller Details (Name, age, phone, emergency contact, special accessibility needs)
 * 3. Who is Booking? (Self vs Family Member booking for elderly traveller + consent + simulated SMS approval)
 * 4. Confirm & Demo Payment (Price breakdown, sample cancellation policy, fake UPI/Card, SIMULATED banner)
 * 5. Confirmation Voucher (Booking ID, QR voucher, .ics Calendar download, WhatsApp share, SOS CTA)
 * 
 * Compatible with standard mode and Saral Mode (large fonts, 64px+ buttons, voice prompts).
 */

import { store } from '../js/store.js';
import { speechAssistant } from '../js/speech.js';

export function renderBookingView() {
  const container = document.createElement('div');
  container.className = 'container booking-container';
  container.style.maxWidth = '900px';
  container.style.margin = '0 auto';
  container.style.padding = 'var(--space-6) var(--space-4) 120px var(--space-4)';

  const state = store.getState();
  const isSaral = state.saralMode || document.documentElement.classList.contains('saral');

  // Load destination, stay and guide from store with robust fallbacks
  const prefs = state.preferences || {};
  const destination = prefs.destinationName || prefs.destination || 'Manali';
  const days = parseInt(prefs.days, 10) || 3;
  const travellersCount = parseInt(prefs.travellers, 10) || 2;

  const stay = state.selectedStay || {
    id: 'stay-default',
    name: destination.includes('Varanasi') ? 'Kashi Heritage Riverside Home' : 'Burwa Apple Woods Homestay',
    area: destination.includes('Varanasi') ? 'Assi Ghat Lane' : 'Burwa Village (6 km from Manali)',
    pricePerNight: 1400,
    phone: '+91 98160 44221',
    seniorFriendly: true
  };

  const guide = state.selectedGuide || {
    id: 'guide-default',
    name: destination.includes('Varanasi') ? 'Pandit Rameshwar Shastri' : 'Suresh Thakur',
    yearsExperience: 14,
    pricePerDay: 1200,
    phone: '+91 94180 55663',
    languages: ['Hindi', 'English']
  };

  // Pricing math: 90% community retention, 10% platform fee
  const roomsCount = Math.ceil(travellersCount / 2);
  const staySubtotal = stay.pricePerNight * roomsCount * Math.max(1, days - 1);
  const guideSubtotal = guide.pricePerDay * days;
  const localDirectIncome = Math.round((staySubtotal + guideSubtotal) * 0.90);
  const platformFee = Math.round((staySubtotal + guideSubtotal) * 0.10);
  const grandTotal = staySubtotal + guideSubtotal + platformFee;

  // Restore draft or initialize form data
  const draft = store.getDraftBooking() || {};
  let currentStep = draft.step || 1;

  const formData = {
    // Step 2: Traveller
    travellerName: draft.travellerName || '',
    travellerAge: draft.travellerAge || '',
    travellerPhone: draft.travellerPhone || '',
    emergencyContactName: draft.emergencyContactName || '',
    emergencyContactPhone: draft.emergencyContactPhone || '',
    specialGroundFloor: draft.specialGroundFloor !== undefined ? draft.specialGroundFloor : true,
    specialLowWalking: draft.specialLowWalking !== undefined ? draft.specialLowWalking : true,
    specialDiet: draft.specialDiet !== undefined ? draft.specialDiet : false,
    specialWheelchair: draft.specialWheelchair !== undefined ? draft.specialWheelchair : false,

    // Step 3: Who is booking
    bookingType: draft.bookingType || 'self', // 'self' | 'family'
    bookerName: draft.bookerName || '',
    bookerRelation: draft.bookerRelation || 'Son',
    bookerPhone: draft.bookerPhone || '',
    familyConsent: draft.familyConsent !== undefined ? draft.familyConsent : true,

    // Step 4: Payment selection
    paymentMethod: draft.paymentMethod || 'upi_demo' // 'upi_demo' | 'card_demo' | 'cash_arrival'
  };

  let confirmedBooking = null;

  function saveCurrentDraft() {
    store.saveDraftBooking({
      step: currentStep,
      ...formData
    });
  }

  function renderCurrentStep() {
    container.innerHTML = `
      <!-- Stepper Progress Header -->
      <nav class="stepper" aria-label="Booking flow progress" style="margin-bottom: var(--space-8);">
        <div class="step-item ${currentStep >= 1 ? (currentStep > 1 ? 'completed' : 'active') : ''}">
          <div class="step-number">${currentStep > 1 ? '✓' : '1'}</div>
          <span class="step-label">1. Review</span>
        </div>
        <div class="step-item ${currentStep >= 2 ? (currentStep > 2 ? 'completed' : 'active') : ''}">
          <div class="step-number">${currentStep > 2 ? '✓' : '2'}</div>
          <span class="step-label">2. Traveller</span>
        </div>
        <div class="step-item ${currentStep >= 3 ? (currentStep > 3 ? 'completed' : 'active') : ''}">
          <div class="step-number">${currentStep > 3 ? '✓' : '3'}</div>
          <span class="step-label">3. Booker</span>
        </div>
        <div class="step-item ${currentStep >= 4 ? (currentStep > 4 ? 'completed' : 'active') : ''}">
          <div class="step-number">${currentStep > 4 ? '✓' : '4'}</div>
          <span class="step-label">4. Confirm</span>
        </div>
        <div class="step-item ${currentStep === 5 ? 'active' : ''}">
          <div class="step-number">5</div>
          <span class="step-label">5. Voucher</span>
        </div>
      </nav>

      <!-- Saral Audio Guidance Toolbar (Always available in Saral Mode or on demand) -->
      ${isSaral ? `
        <div class="saral-audio-bar flex-between" style="margin-bottom: var(--space-6);">
          <div style="font-weight: 700; color: #0B4F4A;">
            🔊 Step ${currentStep} of 5 Guidance
          </div>
          <div class="flex gap-2">
            <button type="button" class="btn btn-ghost btn-sm" id="btn-read-booking-step" style="min-height: 44px; font-size: 0.95rem;">
              🔊 Read Step Aloud
            </button>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-stop-booking-step" style="min-height: 44px; font-size: 0.95rem;">
              ⏹️ Stop
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Dynamic Step Content Form -->
      <div id="booking-step-content" class="flow">
        ${getStepMarkup(currentStep)}
      </div>

      <!-- Navigation Actions (Steps 1 to 4) -->
      ${currentStep < 5 ? `
        <div class="flex-between" style="gap: var(--space-4); margin-top: var(--space-8); padding-top: var(--space-6); border-top: 2px solid var(--color-border); flex-wrap: wrap;">
          <div>
            ${currentStep > 1 ? `
              <button type="button" id="btn-booking-back" class="btn btn-ghost" style="min-width: 150px;">
                ← Back
              </button>
            ` : `
              <a href="#/stays" class="btn btn-ghost" style="min-width: 150px;">
                ← Back to Stays
              </a>
            `}
          </div>

          <div>
            ${currentStep < 4 ? `
              <button type="button" id="btn-booking-next" class="btn btn-primary" style="min-width: 200px;">
                Continue to Step ${currentStep + 1} ➔
              </button>
            ` : `
              <button type="button" id="btn-booking-confirm-pay" class="btn btn-primary" style="min-width: 260px; background-color: var(--color-accent); border-color: var(--color-accent-hover);">
                Confirm Booking (Demo ₹${grandTotal.toLocaleString('en-IN')}) ➔
              </button>
            `}
          </div>
        </div>
      ` : ''}
    `;

    bindStepListeners();
  }

  function getStepMarkup(step) {
    if (step === 1) {
      // Step 1: Review Trip & Local Community Income
      return `
        <div class="flow">
          <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-2);">
            <div>
              <span class="badge badge-verified">Step 1 of 5</span>
              <h1 style="margin-top: var(--space-2); margin-bottom: 0;">Review Your Local Journey</h1>
              <p style="color: var(--color-text-muted); margin-top: var(--space-1);">
                Transparent itemised breakdown with direct host community payout.
              </p>
            </div>
          </div>

          <!-- 90% Direct Local Host Income Banner -->
          <div class="card" style="background: linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%); border: 2px solid #059669; padding: var(--space-4);">
            <div class="flex gap-3" style="align-items: center;">
              <div style="font-size: 2.2rem;">🌱</div>
              <div>
                <strong style="color: #065F46; font-size: 1.15rem;">Local-First Community Retention:</strong>
                <p style="margin: 4px 0 0; color: #047857; font-size: var(--font-size-sm); line-height: 1.5;">
                  <strong>₹${localDirectIncome.toLocaleString('en-IN')}</strong> of your payment goes directly to ${stay.name} and your local guide (90% community retention). Only a nominal 10% platform fee supports app hosting and safety beacons.
                </p>
              </div>
            </div>
          </div>

          <!-- Trip Overview Grid -->
          <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-4);">
            <!-- Homestay Card -->
            <div class="card flow" style="border-left: 4px solid var(--color-primary);">
              <div class="flex-between">
                <span class="badge badge-verified">🏡 Reserved Homestay</span>
                <strong>₹${stay.pricePerNight}/night</strong>
              </div>
              <h3 style="margin: 0; font-size: 1.25rem;">${stay.name}</h3>
              <p style="color: var(--color-text-muted); font-size: var(--font-size-xs); margin: 0;">📍 ${stay.area}</p>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-main); background-color: var(--color-bg); padding: var(--space-2); border-radius: var(--radius-sm);">
                ✓ Ground-floor senior room • ${roomsCount} Room(s) • ${Math.max(1, days - 1)} Night(s)
              </div>
            </div>

            <!-- Guide Card -->
            <div class="card flow" style="border-left: 4px solid var(--color-accent);">
              <div class="flex-between">
                <span class="badge badge-verified">🪪 Verified Guide</span>
                <strong>₹${guide.pricePerDay}/day</strong>
              </div>
              <h3 style="margin: 0; font-size: 1.25rem;">${guide.name}</h3>
              <p style="color: var(--color-text-muted); font-size: var(--font-size-xs); margin: 0;">🎓 ${guide.yearsExperience} yrs licensed</p>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-main); background-color: var(--color-bg); padding: var(--space-2); border-radius: var(--radius-sm);">
                ✓ Personalized assistance • ${days} Day(s) • Languages: ${guide.languages ? guide.languages.join(', ') : 'Hindi, English'}
              </div>
            </div>
          </div>

          <!-- Itemised Bill Summary -->
          <div class="card flow" style="background-color: var(--color-bg-surface); padding: var(--space-5);">
            <h3 style="margin: 0 0 var(--space-3) 0;">Itemised Cost Breakdown</h3>
            <div class="flex-between" style="font-size: var(--font-size-sm); padding: var(--space-2) 0; border-bottom: 1px dashed var(--color-border);">
              <span>Homestay (${roomsCount} room × ${Math.max(1, days - 1)} nights @ ₹${stay.pricePerNight})</span>
              <strong>₹${staySubtotal.toLocaleString('en-IN')}</strong>
            </div>
            <div class="flex-between" style="font-size: var(--font-size-sm); padding: var(--space-2) 0; border-bottom: 1px dashed var(--color-border);">
              <span>Local Guide (${days} days @ ₹${guide.pricePerDay})</span>
              <strong>₹${guideSubtotal.toLocaleString('en-IN')}</strong>
            </div>
            <div class="flex-between" style="font-size: var(--font-size-sm); padding: var(--space-2) 0; border-bottom: 1px dashed var(--color-border);">
              <span>Nominal Platform & SOS Fee (10%)</span>
              <span>₹${platformFee.toLocaleString('en-IN')}</span>
            </div>
            <div class="flex-between" style="font-size: 1.35rem; font-weight: 800; color: var(--color-primary); padding-top: var(--space-2);">
              <span>Total Payable (Simulated Demo):</span>
              <span>₹${grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      `;
    }

    if (step === 2) {
      // Step 2: Traveller Details
      return `
        <div class="flow">
          <span class="badge badge-verified">Step 2 of 5</span>
          <h1 style="margin-top: var(--space-2); margin-bottom: 0;">Traveller Details</h1>
          <p style="color: var(--color-text-muted); margin-top: var(--space-1);">
            Provide details of the person traveling. Hosts and local guides use this to prepare accommodations.
          </p>

          <form id="form-traveller-details" class="card flow" style="padding: var(--space-6);" novalidate>
            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-4);">
              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="inp-traveller-name">Primary Traveller Full Name <span style="color: var(--color-danger);">*</span></label>
                <input type="text" id="inp-traveller-name" class="form-input" placeholder="e.g. Ramesh Chandra Sharma" value="${formData.travellerName}" required />
                <div class="form-hint" id="err-traveller-name" style="display: none; color: var(--color-danger);">Please enter traveller's full name.</div>
              </div>

              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="inp-traveller-age">Age <span style="color: var(--color-danger);">*</span></label>
                <input type="number" id="inp-traveller-age" class="form-input" placeholder="e.g. 68" min="5" max="110" value="${formData.travellerAge}" required />
                <div class="form-hint" id="err-traveller-age" style="display: none; color: var(--color-danger);">Please enter a valid age.</div>
              </div>
            </div>

            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-4);">
              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="inp-traveller-phone">Mobile Phone (WhatsApp) <span style="color: var(--color-danger);">*</span></label>
                <input type="tel" id="inp-traveller-phone" class="form-input" placeholder="e.g. +91 98765 43210" value="${formData.travellerPhone}" required />
                <div class="form-hint" id="err-traveller-phone" style="display: none; color: var(--color-danger);">Please enter a 10-digit mobile number.</div>
              </div>

              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="inp-emergency-contact">Emergency Contact Phone <span style="color: var(--color-danger);">*</span></label>
                <input type="tel" id="inp-emergency-contact" class="form-input" placeholder="e.g. +91 98111 22334" value="${formData.emergencyContactPhone}" required />
                <div class="form-hint" id="err-emergency-contact" style="display: none; color: var(--color-danger);">Please provide an emergency contact number.</div>
              </div>
            </div>

            <!-- Accessibility & Special Preferences -->
            <div style="border-top: 1px solid var(--color-border); padding-top: var(--space-4);">
              <strong style="display: block; margin-bottom: var(--space-2); color: var(--color-text-main);">Accessibility & Comfort Requests:</strong>
              <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3);">
                <label class="flex gap-2" style="align-items: center; cursor: pointer; font-size: var(--font-size-sm);">
                  <input type="checkbox" id="chk-ground-floor" ${formData.specialGroundFloor ? 'checked' : ''} style="width: 20px; height: 20px;" />
                  <span>Ground-floor room (No stairs)</span>
                </label>
                <label class="flex gap-2" style="align-items: center; cursor: pointer; font-size: var(--font-size-sm);">
                  <input type="checkbox" id="chk-minimal-walking" ${formData.specialLowWalking ? 'checked' : ''} style="width: 20px; height: 20px;" />
                  <span>Minimal walking routes</span>
                </label>
                <label class="flex gap-2" style="align-items: center; cursor: pointer; font-size: var(--font-size-sm);">
                  <input type="checkbox" id="chk-diet" ${formData.specialDiet ? 'checked' : ''} style="width: 20px; height: 20px;" />
                  <span>Simple sattvic / low-spice food</span>
                </label>
                <label class="flex gap-2" style="align-items: center; cursor: pointer; font-size: var(--font-size-sm);">
                  <input type="checkbox" id="chk-wheelchair" ${formData.specialWheelchair ? 'checked' : ''} style="width: 20px; height: 20px;" />
                  <span>Wheelchair / e-rickshaw support</span>
                </label>
              </div>
            </div>
          </form>
        </div>
      `;
    }

    if (step === 3) {
      // Step 3: Who is Booking? (Family-Assisted Mode)
      const isFamily = formData.bookingType === 'family';

      return `
        <div class="flow">
          <span class="badge badge-verified">Step 3 of 5</span>
          <h1 style="margin-top: var(--space-2); margin-bottom: 0;">Who is Making This Booking?</h1>
          <p style="color: var(--color-text-muted); margin-top: var(--space-1);">
            YatraLocal allows sons, daughters, and relatives to book and manage peaceful trips for elders.
          </p>

          <!-- Mode Selector Radio Cards -->
          <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-4);" role="radiogroup">
            <button type="button" class="card card-interactive flow ${!isFamily ? 'selected' : ''}" id="btn-mode-self" style="border: 3px solid ${!isFamily ? 'var(--color-primary)' : 'var(--color-border)'}; text-align: left; background-color: ${!isFamily ? '#F0FDF4' : 'var(--color-bg-surface)'}; padding: var(--space-5);">
              <div style="font-size: 2rem;">👤</div>
              <h3 style="margin: 0; font-size: 1.25rem;">I am booking for myself</h3>
              <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin: 0;">
                I will be traveling directly. All SMS, vouchers, and host contact info will be sent to my mobile number.
              </p>
            </button>

            <button type="button" class="card card-interactive flow ${isFamily ? 'selected' : ''}" id="btn-mode-family" style="border: 3px solid ${isFamily ? 'var(--color-primary)' : 'var(--color-border)'}; text-align: left; background-color: ${isFamily ? '#F0FDF4' : 'var(--color-bg-surface)'}; padding: var(--space-5);">
              <div style="font-size: 2rem;">👨‍👩‍👧</div>
              <h3 style="margin: 0; font-size: 1.25rem;">A family member is booking for the traveller</h3>
              <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin: 0;">
                Family-assisted mode. Co-ordinates vouchers, emergency calls, and payments on behalf of an elder relative.
              </p>
            </button>
          </div>

          <!-- Family Booker Details Drawer -->
          <div id="family-booker-panel" class="card flow" style="display: ${isFamily ? 'block' : 'none'}; border: 2px solid var(--color-accent); background-color: #FFFDF9; padding: var(--space-6);">
            <div class="flex-between">
              <strong style="color: var(--color-accent); font-size: 1.15rem;">👨‍👩‍👧 Family Companion Information:</strong>
              <span class="badge badge-local">Mirrored Updates</span>
            </div>

            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4);">
              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="inp-booker-name">Your Full Name (Booker) <span style="color: var(--color-danger);">*</span></label>
                <input type="text" id="inp-booker-name" class="form-input" placeholder="e.g. Rohit Sharma" value="${formData.bookerName}" />
                <div class="form-hint" id="err-booker-name" style="display: none; color: var(--color-danger);">Please enter your name.</div>
              </div>

              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="sel-booker-relation">Relationship to Traveller <span style="color: var(--color-danger);">*</span></label>
                <select id="sel-booker-relation" class="form-select">
                  <option value="Son" ${formData.bookerRelation === 'Son' ? 'selected' : ''}>Son</option>
                  <option value="Daughter" ${formData.bookerRelation === 'Daughter' ? 'selected' : ''}>Daughter</option>
                  <option value="Grandchild" ${formData.bookerRelation === 'Grandchild' ? 'selected' : ''}>Grandchild</option>
                  <option value="Spouse" ${formData.bookerRelation === 'Spouse' ? 'selected' : ''}>Spouse</option>
                  <option value="Relative / Caregiver" ${formData.bookerRelation === 'Relative / Caregiver' ? 'selected' : ''}>Relative / Caregiver</option>
                </select>
              </div>

              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="inp-booker-phone">Your Mobile Phone (Updates) <span style="color: var(--color-danger);">*</span></label>
                <input type="tel" id="inp-booker-phone" class="form-input" placeholder="e.g. +91 99887 76655" value="${formData.bookerPhone}" />
                <div class="form-hint" id="err-booker-phone" style="display: none; color: var(--color-danger);">Please enter your phone number.</div>
              </div>
            </div>

            <!-- Simulated Traveller Approval Request Feature -->
            <div style="background-color: #FEF3C7; padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); border: 1.5px solid #F59E0B;" class="flex-between">
              <div>
                <strong style="color: #92400E; font-size: var(--font-size-sm);">Simulated Traveller Consent:</strong>
                <p style="margin: 2px 0 0; color: #78350F; font-size: var(--font-size-xs);">
                  Optionally dispatch an approval preview notification to ${formData.travellerName || "the traveller"} via WhatsApp/SMS.
                </p>
              </div>
              <button type="button" id="btn-send-approval-sms" class="btn btn-secondary btn-sm" style="font-size: var(--font-size-xs); white-space: nowrap;">
                📲 Send Approval Request
              </button>
            </div>

            <!-- Consent & Dual Update Guarantee -->
            <label class="flex gap-2" style="align-items: flex-start; cursor: pointer; font-size: var(--font-size-sm); margin-top: var(--space-2);">
              <input type="checkbox" id="chk-family-consent" ${formData.familyConsent ? 'checked' : ''} style="width: 20px; height: 20px; margin-top: 2px;" />
              <span>
                <strong>Explicit Family Authorization:</strong> I confirm I am booking on behalf of <em>${formData.travellerName || 'the traveller'}</em> with their knowledge. Trip vouchers, host contacts, and live SOS emergency updates will be shared directly with both of our phone numbers.
              </span>
            </label>
          </div>
        </div>
      `;
    }

    if (step === 4) {
      // Step 4: Confirm & Demo Payment
      return `
        <div class="flow">
          <span class="badge badge-verified">Step 4 of 5</span>
          <h1 style="margin-top: var(--space-2); margin-bottom: 0;">Review & Demo Payment</h1>
          <p style="color: var(--color-text-muted); margin-top: var(--space-1);">
            Review details and complete the simulated transaction.
          </p>

          <!-- High Visibility Simulation Banner -->
          <div class="card" style="background-color: #FEF2F2; border: 2.5px solid #DC2626; padding: var(--space-4); text-align: center;">
            <div style="font-weight: 800; font-size: 1.25rem; color: #991B1B; margin-bottom: 4px;">
              ⚠️ SIMULATED DEMO — NO REAL MONEY IS CHARGED
            </div>
            <p style="margin: 0; color: #B91C1C; font-size: var(--font-size-sm);">
              This hackathon prototype simulates payment transactions. You can test UPI QR, Mock Card, or Cash on Arrival risk-free.
            </p>
          </div>

          <!-- Price & Cancellation Summary Card -->
          <div class="card flow" style="padding: var(--space-5);">
            <div class="flex-between">
              <div>
                <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Total Trip Cost</span>
                <div style="font-size: 2rem; font-weight: 800; color: var(--color-primary);">₹${grandTotal.toLocaleString('en-IN')}</div>
              </div>
              <div style="text-align: right;">
                <span class="badge badge-verified">✓ 100% Free Cancellation</span>
                <p style="margin: 4px 0 0; font-size: var(--font-size-xs); color: var(--color-text-muted);">
                  Cancel anytime up to 48 hours before check-in for a full direct refund.
                </p>
              </div>
            </div>
          </div>

          <!-- Demo Payment Options Selector -->
          <div class="card flow" style="padding: var(--space-5);">
            <h3 style="margin: 0 0 var(--space-2) 0;">Select Payment Method (Demo):</h3>
            
            <div class="grid" style="grid-template-columns: 1fr; gap: var(--space-3);" role="radiogroup">
              <!-- UPI Option -->
              <label class="card card-interactive flex-between" style="cursor: pointer; padding: var(--space-3) var(--space-4); border: 2px solid ${formData.paymentMethod === 'upi_demo' ? 'var(--color-primary)' : 'var(--color-border)'};">
                <div class="flex gap-3" style="align-items: center;">
                  <input type="radio" name="pay-method" value="upi_demo" ${formData.paymentMethod === 'upi_demo' ? 'checked' : ''} style="width: 20px; height: 20px;" />
                  <div>
                    <strong style="color: var(--color-text-main);">Instant UPI (Google Pay, PhonePe, Paytm, BHIM)</strong>
                    <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">One-click QR code and VPA verification (Simulated)</div>
                  </div>
                </div>
                <span style="font-size: 1.5rem;">📱</span>
              </label>

              <!-- Card Option -->
              <label class="card card-interactive flex-between" style="cursor: pointer; padding: var(--space-3) var(--space-4); border: 2px solid ${formData.paymentMethod === 'card_demo' ? 'var(--color-primary)' : 'var(--color-border)'};">
                <div class="flex gap-3" style="align-items: center;">
                  <input type="radio" name="pay-method" value="card_demo" ${formData.paymentMethod === 'card_demo' ? 'checked' : ''} style="width: 20px; height: 20px;" />
                  <div>
                    <strong style="color: var(--color-text-main);">Debit / Credit Card (RuPay, Visa, Mastercard)</strong>
                    <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Simulated instant gateway clearance</div>
                  </div>
                </div>
                <span style="font-size: 1.5rem;">💳</span>
              </label>

              <!-- Cash on Arrival Option -->
              <label class="card card-interactive flex-between" style="cursor: pointer; padding: var(--space-3) var(--space-4); border: 2px solid ${formData.paymentMethod === 'cash_arrival' ? 'var(--color-primary)' : 'var(--color-border)'};">
                <div class="flex gap-3" style="align-items: center;">
                  <input type="radio" name="pay-method" value="cash_arrival" ${formData.paymentMethod === 'cash_arrival' ? 'checked' : ''} style="width: 20px; height: 20px;" />
                  <div>
                    <strong style="color: var(--color-text-main);">Pay Cash Directly on Arrival to Host</strong>
                    <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Hand cash to Uncle Ramesh / Devinder in the village</div>
                  </div>
                </div>
                <span style="font-size: 1.5rem;">🤝</span>
              </label>
            </div>
          </div>
        </div>
      `;
    }

    if (step === 5) {
      // Step 5: Confirmation Voucher & Action Shortcuts
      const booking = confirmedBooking || {
        id: 'YL-2026-DEMO',
        destination,
        stayName: stay.name,
        guideName: guide.name,
        travellerName: formData.travellerName || 'Valued Traveller',
        grandTotal,
        createdAt: new Date().toISOString()
      };

      const shareText = encodeURIComponent(
        `🎉 YatraLocal Booking Confirmed!\nDestination: ${booking.destination}\nBooking ID: ${booking.id}\nStay: ${stay.name}\nGuide: ${guide.name}\nTotal: ₹${booking.grandTotal}\nView in YatraLocal app: ${window.location.origin}/#/trips`
      );

      return `
        <div class="flow" style="text-align: center;">
          <!-- Success Graphic -->
          <div style="font-size: 3.5rem; animation: pulse 1.5s infinite;">🎉</div>
          <span class="badge badge-verified" style="font-size: 1.1rem; padding: 6px 16px;">✓ Booking Confirmed (Simulated)</span>
          <h1 style="margin: var(--space-2) 0; color: var(--color-primary);">You're Going to ${booking.destination}!</h1>
          <p style="color: var(--color-text-muted); font-size: var(--font-size-md); max-width: 600px; margin: 0 auto var(--space-6);">
            Your reservation is confirmed. Both your homestay host and local guide have received your arrival notice.
          </p>

          <!-- Digital Voucher Card -->
          <div class="card flow" style="max-width: 650px; margin: 0 auto var(--space-8); text-align: left; border: 3px solid var(--color-primary); background-color: #FFFFFF; padding: var(--space-6); box-shadow: var(--shadow-lg);">
            <div class="flex-between" style="border-bottom: 2px dashed var(--color-border); padding-bottom: var(--space-4);">
              <div>
                <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">BOOKING REFERENCE</span>
                <div style="font-size: 1.75rem; font-weight: 800; color: var(--color-primary); letter-spacing: 0.05em;">
                  ${booking.id}
                </div>
              </div>

              <!-- Simulated QR Code SVG Graphic -->
              <div style="text-align: center;">
                <svg width="84" height="84" viewBox="0 0 100 100" style="border: 2px solid #000; border-radius: 6px; padding: 4px; background: #fff;" aria-label="QR Code Voucher">
                  <rect x="0" y="0" width="30" height="30" fill="#000"/>
                  <rect x="5" y="5" width="20" height="20" fill="#fff"/>
                  <rect x="10" y="10" width="10" height="10" fill="#000"/>
                  <rect x="70" y="0" width="30" height="30" fill="#000"/>
                  <rect x="75" y="5" width="20" height="20" fill="#fff"/>
                  <rect x="80" y="10" width="10" height="10" fill="#000"/>
                  <rect x="0" y="70" width="30" height="30" fill="#000"/>
                  <rect x="5" y="75" width="20" height="20" fill="#fff"/>
                  <rect x="10" y="80" width="10" height="10" fill="#000"/>
                  <rect x="40" y="10" width="15" height="15" fill="#000"/>
                  <rect x="45" y="45" width="25" height="25" fill="#000"/>
                  <rect x="70" y="70" width="20" height="20" fill="#000"/>
                </svg>
                <div style="font-size: 10px; color: var(--color-text-muted); font-weight: 700;">DIGITAL PASS</div>
              </div>
            </div>

            <!-- Details List -->
            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); margin-top: var(--space-4); font-size: var(--font-size-sm);">
              <div>
                <span style="color: var(--color-text-muted);">Traveller:</span>
                <div style="font-weight: 700;">${formData.travellerName || 'Ramesh Sharma'} (${formData.travellerAge || '68'} yrs)</div>
              </div>
              <div>
                <span style="color: var(--color-text-muted);">Destination:</span>
                <div style="font-weight: 700;">${booking.destination} (${days} Days)</div>
              </div>
              <div>
                <span style="color: var(--color-text-muted);">Homestay:</span>
                <div style="font-weight: 700;">${stay.name}</div>
                <div style="font-size: var(--font-size-xs); color: var(--color-primary);">📞 ${stay.phone}</div>
              </div>
              <div>
                <span style="color: var(--color-text-muted);">Local Guide:</span>
                <div style="font-weight: 700;">${guide.name}</div>
                <div style="font-size: var(--font-size-xs); color: var(--color-accent);">📞 ${guide.phone}</div>
              </div>
            </div>

            ${formData.bookingType === 'family' ? `
              <div style="background-color: #FEF3C7; padding: var(--space-3); border-radius: var(--radius-sm); font-size: var(--font-size-xs); color: #92400E; margin-top: var(--space-4);">
                ✓ <strong>Family Booker:</strong> ${formData.bookerName} (${formData.bookerRelation}) • Updates dispatched to ${formData.bookerPhone}
              </div>
            ` : ''}
          </div>

          <!-- Action Buttons Grid -->
          <div class="flex-center gap-3" style="flex-wrap: wrap; max-width: 650px; margin: 0 auto var(--space-8);">
            <!-- Download .ICS Calendar -->
            <button type="button" id="btn-download-ics" class="btn btn-secondary" style="font-weight: 700;">
              📅 Add to Calendar (.ics)
            </button>

            <!-- WhatsApp Share Deep Link -->
            <a href="https://api.whatsapp.com/send?text=${shareText}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="background-color: #25D366; border-color: #128C7E; font-weight: 700;">
              💬 Share on WhatsApp
            </a>

            <!-- Copy Link Button -->
            <button type="button" id="btn-copy-booking-link" class="btn btn-ghost" style="font-weight: 700;">
              🔗 Copy Voucher Link
            </button>
          </div>

          <!-- SOS Setup Card CTA -->
          <div class="card" style="max-width: 650px; margin: 0 auto; background-color: #FFF5F5; border: 2px solid var(--color-danger); text-align: left; padding: var(--space-4);">
            <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-2);">
              <div class="flex gap-2" style="align-items: center;">
                <span style="font-size: 1.75rem;">🚨</span>
                <div>
                  <strong style="color: var(--color-danger);">Setup Emergency SOS Contacts:</strong>
                  <p style="margin: 2px 0 0; color: #7F1D1D; font-size: var(--font-size-xs);">
                    Ensure your family companion or tourist police (1363) are linked to the floating SOS button.
                  </p>
                </div>
              </div>
              <a href="#/sos" class="btn btn-danger btn-sm" style="text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                Manage SOS Contacts ➔
              </a>
            </div>
          </div>

          <div style="margin-top: var(--space-8);">
            <a href="#/trips" class="btn btn-ghost btn-lg" style="font-weight: 700;">
              View in My Trips List (#/trips) ➔
            </a>
          </div>
        </div>
      `;
    }

    return '';
  }

  function bindStepListeners() {
    // Saral voice button
    container.querySelector('#btn-read-booking-step')?.addEventListener('click', () => {
      readStepAloud(currentStep);
    });
    container.querySelector('#btn-stop-booking-step')?.addEventListener('click', () => {
      speechAssistant.stop();
    });

    // Step 2 Form Listeners
    if (currentStep === 2) {
      const nameInput = container.querySelector('#inp-traveller-name');
      const ageInput = container.querySelector('#inp-traveller-age');
      const phoneInput = container.querySelector('#inp-traveller-phone');
      const emergencyInput = container.querySelector('#inp-emergency-contact');

      nameInput?.addEventListener('input', (e) => { formData.travellerName = e.target.value; saveCurrentDraft(); });
      ageInput?.addEventListener('input', (e) => { formData.travellerAge = e.target.value; saveCurrentDraft(); });
      phoneInput?.addEventListener('input', (e) => { formData.travellerPhone = e.target.value; saveCurrentDraft(); });
      emergencyInput?.addEventListener('input', (e) => { formData.emergencyContactPhone = e.target.value; saveCurrentDraft(); });

      container.querySelector('#chk-ground-floor')?.addEventListener('change', (e) => { formData.specialGroundFloor = e.target.checked; saveCurrentDraft(); });
      container.querySelector('#chk-minimal-walking')?.addEventListener('change', (e) => { formData.specialLowWalking = e.target.checked; saveCurrentDraft(); });
      container.querySelector('#chk-diet')?.addEventListener('change', (e) => { formData.specialDiet = e.target.checked; saveCurrentDraft(); });
      container.querySelector('#chk-wheelchair')?.addEventListener('change', (e) => { formData.specialWheelchair = e.target.checked; saveCurrentDraft(); });
    }

    // Step 3 Form Listeners (Who is booking)
    if (currentStep === 3) {
      const btnSelf = container.querySelector('#btn-mode-self');
      const btnFamily = container.querySelector('#btn-mode-family');
      const familyPanel = container.querySelector('#family-booker-panel');

      btnSelf?.addEventListener('click', () => {
        formData.bookingType = 'self';
        saveCurrentDraft();
        renderCurrentStep();
      });

      btnFamily?.addEventListener('click', () => {
        formData.bookingType = 'family';
        saveCurrentDraft();
        renderCurrentStep();
      });

      const bookerNameInput = container.querySelector('#inp-booker-name');
      const bookerRelSelect = container.querySelector('#sel-booker-relation');
      const bookerPhoneInput = container.querySelector('#inp-booker-phone');
      const familyConsentChk = container.querySelector('#chk-family-consent');

      bookerNameInput?.addEventListener('input', (e) => { formData.bookerName = e.target.value; saveCurrentDraft(); });
      bookerRelSelect?.addEventListener('change', (e) => { formData.bookerRelation = e.target.value; saveCurrentDraft(); });
      bookerPhoneInput?.addEventListener('input', (e) => { formData.bookerPhone = e.target.value; saveCurrentDraft(); });
      familyConsentChk?.addEventListener('change', (e) => { formData.familyConsent = e.target.checked; saveCurrentDraft(); });

      // Simulated Approval SMS Dispatch
      container.querySelector('#btn-send-approval-sms')?.addEventListener('click', () => {
        const destNum = formData.travellerPhone || '+91 98765 43210';
        window.YatraApp.showToast(`📲 Simulated SMS sent to ${destNum}: "${formData.bookerName || 'Your family member'} has organized your trip to ${destination}. Reply YES to approve."`);
      });
    }

    // Step 4 Form Listeners (Payment)
    if (currentStep === 4) {
      container.querySelectorAll('input[name="pay-method"]').forEach((radio) => {
        radio.addEventListener('change', (e) => {
          formData.paymentMethod = e.target.value;
          saveCurrentDraft();
          renderCurrentStep();
        });
      });
    }

    // Navigation buttons
    container.querySelector('#btn-booking-back')?.addEventListener('click', () => {
      if (currentStep > 1) {
        currentStep--;
        saveCurrentDraft();
        renderCurrentStep();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    container.querySelector('#btn-booking-next')?.addEventListener('click', () => {
      if (validateCurrentStep(currentStep)) {
        currentStep++;
        saveCurrentDraft();
        renderCurrentStep();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // Step 4 Confirm & Pay
    container.querySelector('#btn-booking-confirm-pay')?.addEventListener('click', () => {
      confirmedBooking = store.addBooking({
        destination,
        days,
        travellersCount,
        stay,
        guide,
        grandTotal,
        localDirectIncome,
        platformFee,
        ...formData
      });

      // Auto-sync emergency contacts to SOS settings
      try {
        const sosSettings = store.getSosSettings();
        const existingContacts = [...(sosSettings.emergencyContacts || [])];
        const newContacts = [];

        if (formData.emergencyContactPhone && formData.emergencyContactPhone.trim()) {
          const exists = existingContacts.some((c) => c.phone.includes(formData.emergencyContactPhone.trim()));
          if (!exists) {
            newContacts.push({
              id: `c_${Date.now()}`,
              name: 'Emergency Guardian',
              relation: 'Emergency Contact',
              phone: formData.emergencyContactPhone.trim()
            });
          }
        }

        if (formData.bookingType === 'family' && formData.bookerPhone && formData.bookerPhone.trim()) {
          const exists = existingContacts.some((c) => c.phone.includes(formData.bookerPhone.trim()));
          if (!exists) {
            newContacts.push({
              id: `c_${Date.now() + 1}`,
              name: formData.bookerName || 'Family Booker',
              relation: formData.bookerRelation || 'Companion',
              phone: formData.bookerPhone.trim()
            });
          }
        }

        if (newContacts.length > 0) {
          store.updateSosSettings({
            emergencyContacts: [...newContacts, ...existingContacts].slice(0, 3)
          });
        }
      } catch (e) {
        console.warn('Could not auto-sync SOS contact from booking form:', e);
      }

      currentStep = 5;
      renderCurrentStep();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.YatraApp.showToast(`🎉 Booking confirmed! Reference: ${confirmedBooking.id}`);
    });

    // Step 5 Confirmation Actions
    if (currentStep === 5) {
      // Download .ICS calendar
      container.querySelector('#btn-download-ics')?.addEventListener('click', () => {
        const booking = confirmedBooking || { id: 'YL-2026-DEMO', destination, stayName: stay.name, guideName: guide.name, days };
        downloadICSFile(booking);
      });

      // Copy link
      container.querySelector('#btn-copy-booking-link')?.addEventListener('click', () => {
        const url = `${window.location.origin}/#/trips`;
        navigator.clipboard?.writeText(url);
        window.YatraApp.showToast('📋 Trip link copied to clipboard!');
      });
    }
  }

  function validateCurrentStep(step) {
    if (step === 2) {
      let isValid = true;
      const nameInput = container.querySelector('#inp-traveller-name');
      const ageInput = container.querySelector('#inp-traveller-age');
      const phoneInput = container.querySelector('#inp-traveller-phone');

      if (!formData.travellerName.trim()) {
        const err = container.querySelector('#err-traveller-name');
        if (err) err.style.display = 'block';
        nameInput?.focus();
        isValid = false;
      } else {
        const err = container.querySelector('#err-traveller-name');
        if (err) err.style.display = 'none';
      }

      if (!formData.travellerAge || parseInt(formData.travellerAge, 10) < 5) {
        const err = container.querySelector('#err-traveller-age');
        if (err) err.style.display = 'block';
        if (isValid) ageInput?.focus();
        isValid = false;
      } else {
        const err = container.querySelector('#err-traveller-age');
        if (err) err.style.display = 'none';
      }

      if (!formData.travellerPhone.trim()) {
        const err = container.querySelector('#err-traveller-phone');
        if (err) err.style.display = 'block';
        if (isValid) phoneInput?.focus();
        isValid = false;
      } else {
        const err = container.querySelector('#err-traveller-phone');
        if (err) err.style.display = 'none';
      }

      if (!isValid) window.YatraApp.showToast('Please fill in the required traveller fields');
      return isValid;
    }

    if (step === 3 && formData.bookingType === 'family') {
      let isValid = true;
      if (!formData.bookerName.trim()) {
        const err = container.querySelector('#err-booker-name');
        if (err) err.style.display = 'block';
        isValid = false;
      }
      if (!formData.bookerPhone.trim()) {
        const err = container.querySelector('#err-booker-phone');
        if (err) err.style.display = 'block';
        isValid = false;
      }
      if (!formData.familyConsent) {
        window.YatraApp.showToast('Please confirm family authorization check.');
        isValid = false;
      }
      return isValid;
    }

    return true;
  }

  function readStepAloud(step) {
    let msg = '';
    if (step === 1) {
      msg = `Step 1: Review Trip. Your trip to ${destination} for ${days} days costs ${grandTotal} rupees. Notice that ${localDirectIncome} rupees goes directly to local hosts and guides.`;
    } else if (step === 2) {
      msg = `Step 2: Traveller Details. Please enter the primary traveller's full name, age, mobile phone, and emergency contact.`;
    } else if (step === 3) {
      msg = `Step 3: Who is booking? Select if you are booking for yourself, or if a family member is booking for an elder.`;
    } else if (step === 4) {
      msg = `Step 4: Confirm and Demo Payment. This is a simulated demo. No real money will be charged. Choose UPI, Card, or Pay Cash on Arrival.`;
    } else if (step === 5) {
      msg = `Step 5: Congratulations! Your booking is confirmed. You can add this trip to your calendar or share it on WhatsApp with your family.`;
    }
    speechAssistant.speak(msg);
  }

  // Initial render
  renderCurrentStep();

  return container;
}

/**
 * Generates and downloads a standard RFC 5545 .ics iCalendar file
 */
function downloadICSFile(booking) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7); // 1 week ahead demo
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (booking.days || 3));

  const formatICSDate = (d) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//YatraLocal//Inclusive Indian Tourism//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.id || 'YL-DEMO'}@yatralocal.org`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:YatraLocal Journey: ${booking.destination}`,
    `DESCRIPTION:Booking ID: ${booking.id}\\nHomestay: ${booking.stay?.name || 'Local Homestay'}\\nGuide: ${booking.guide?.name || 'Local Guide'}\\nDirect Host Phone: ${booking.stay?.phone || '+91 98160 44221'}`,
    `LOCATION:${booking.destination}, India`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `YatraLocal-${booking.id || 'Trip'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  window.YatraApp.showToast('📅 iCalendar (.ics) downloaded!');
}
