/**
 * YatraLocal - Saral Mode (Easy / Accessible Travel Experience)
 * Route: #/saral
 * 
 * Features:
 * 1. Visual clarity: High contrast, 22px+ base font, 64px+ min-height buttons.
 * 2. 5-step simplified wizard:
 *    Step 1: Where do you want to go? (with voice input option)
 *    Step 2: How many days?
 *    Step 3: Rough budget (Low / Medium / High)
 *    Step 4: What do you prefer? (Temples / Nature / Family / Rest)
 *    Step 5: Review & Confirmation
 * 3. Web Speech API narration in English & Hindi with Read Aloud & Stop buttons.
 * 4. Always-visible Help and "Call a Family Member" simulation.
 * 5. Simple Results page with collapsible day cards, ONE homestay, ONE guide, and single big "Book this" button.
 */

import { store } from '../js/store.js';
import { speechAssistant } from '../js/speech.js';
import { YatraMap, getDirectionsUrl } from '../js/map.js';

export function renderSaralView() {
  const container = document.createElement('div');
  container.className = 'container saral-container';
  container.style.maxWidth = '920px';
  container.style.margin = '0 auto';
  container.style.padding = 'var(--space-8) var(--space-4) 140px var(--space-4)';

  // Ensure Saral CSS mode is enabled
  document.documentElement.classList.add('saral');
  const saralToggleBtn = document.getElementById('saral-toggle');
  if (saralToggleBtn) {
    saralToggleBtn.classList.add('active');
    saralToggleBtn.setAttribute('aria-pressed', 'true');
  }

  // Wizard state
  const state = store.getState();
  let currentStep = 1;
  let currentLang = state.language || 'EN'; // 'EN' | 'HI'

  const wizardData = {
    destination: 'Varanasi',
    destinationId: 'varanasi',
    days: 3,
    budgetTier: 'Medium',
    budgetAmount: 12000,
    preference: 'Temples & Spiritual',
    preferenceTag: 'Spiritual'
  };

  // Translations dictionary for English & Hindi
  const strings = {
    EN: {
      readAloud: '🔊 Read Aloud',
      stopAudio: '⏹️ Stop Voice',
      helpBtn: '❓ Help',
      callFamilyBtn: '📞 Call Family Member',
      back: '← Back',
      next: 'Next ➔',
      step: 'Step',
      of: 'of 5',
      reviewTitle: 'Review Your Simple Plan',
      makePlan: 'Make My Simple Plan ➔',
      voiceMic: '🎙️ Speak City Name',
      listening: 'Listening... Please speak now',
      destQuestion: 'Where do you want to go?',
      destSub: 'Tap a destination below or speak its name:',
      daysQuestion: 'How many days do you want to travel?',
      daysSub: 'Pick the duration that feels most comfortable:',
      budgetQuestion: 'What is your comfortable budget?',
      budgetSub: 'Choose a rough estimate for the whole trip:',
      prefQuestion: 'What do you prefer the most?',
      prefSub: 'We will select calm, comfortable places for you:',
      youChose: 'You chose',
      bookSimple: 'Book This Simple Plan ➔',
      startOver: '↺ Start Over / Change'
    },
    HI: {
      readAloud: '🔊 पढ़कर सुनाएं',
      stopAudio: '⏹️ आवाज रोकें',
      helpBtn: '❓ मदद',
      callFamilyBtn: '📞 परिवार को फोन करें',
      back: '← वापस',
      next: 'आगे बढ़ें ➔',
      step: 'चरण',
      of: 'का 5',
      reviewTitle: 'अपनी सरल यात्रा योजना देखें',
      makePlan: 'मेरी सरल योजना बनाएं ➔',
      voiceMic: '🎙️ शहर का नाम बोलें',
      listening: 'सुन रहे हैं... कृपया बोलें',
      destQuestion: 'आप कहाँ जाना चाहते हैं?',
      destSub: 'नीचे दिए गए शहर पर क्लिक करें या बोलकर बताएं:',
      daysQuestion: 'आप कितने दिन घूमना चाहते हैं?',
      daysSub: 'जितने दिन आराम से यात्रा कर सकें, चुनें:',
      budgetQuestion: 'आपका अनुमानित बजट क्या है?',
      budgetSub: 'पूरी यात्रा के लिए एक बजट चुनें:',
      prefQuestion: 'आप क्या सबसे ज्यादा पसंद करते हैं?',
      prefSub: 'हम आपके लिए शांत और आसान स्थान चुनेंगे:',
      youChose: 'आपने चुना',
      bookSimple: 'यह सरल यात्रा बुक करें ➔',
      startOver: '↺ फिर से शुरू करें'
    }
  };

  const getT = () => strings[currentLang];

  function renderCurrentStep() {
    container.innerHTML = `
      <!-- Saral Audio Guidance & Support Bar -->
      <div class="saral-audio-bar" role="toolbar" aria-label="Audio and family support">
        <div class="flex gap-2" style="align-items: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-ghost btn-sm" id="saral-read-btn" style="min-height: 48px; font-size: 1rem; border-width: 2px;">
            ${getT().readAloud}
          </button>
          <button type="button" class="btn btn-ghost btn-sm" id="saral-stop-btn" style="min-height: 48px; font-size: 1rem; border-width: 2px;">
            ${getT().stopAudio}
          </button>
          <button type="button" class="btn btn-ghost btn-sm" id="saral-lang-toggle" style="min-height: 48px; font-size: 1rem; border-width: 2px; font-weight: 700;">
            🌐 ${currentLang === 'EN' ? 'हिंदी में सुनें' : 'English Voice'}
          </button>
        </div>

        <div class="flex gap-2" style="align-items: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-ghost btn-sm" id="saral-help-btn" style="min-height: 48px; font-size: 1rem; border-color: #0B4F4A; color: #0B4F4A; font-weight: 700;">
            ${getT().helpBtn}
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="saral-call-family-btn" style="min-height: 48px; font-size: 1rem; font-weight: 700;">
            ${getT().callFamilyBtn}
          </button>
        </div>
      </div>

      <!-- Step Counter Badge -->
      <div style="margin-bottom: var(--space-4);">
        <span class="saral-step-indicator" id="saral-step-indicator">
          ${getT().step} ${currentStep} ${getT().of}
        </span>
      </div>

      <!-- Wizard Step Dynamic Content -->
      <div id="saral-step-content" class="flow" style="margin-bottom: var(--space-8);">
        ${getStepHTML(currentStep, wizardData, currentLang)}
      </div>

      <!-- Live Voice Selection Confirmation Banner -->
      <div id="saral-choice-confirmation" style="display: none; background-color: #E6F4F1; border: 2px solid #0B4F4A; padding: var(--space-3) var(--space-4); border-radius: 12px; margin-bottom: var(--space-6); font-weight: 700; color: #0B4F4A;">
        <span id="confirmation-text"></span>
      </div>

      <!-- Bottom Step Navigation Buttons -->
      <div class="flex-between" style="gap: var(--space-4); flex-wrap: wrap; margin-top: var(--space-8); padding-top: var(--space-6); border-top: 3px solid #E5E7EB;">
        <div>
          ${currentStep > 1 ? `
            <button type="button" id="saral-back-btn" class="saral-btn btn-ghost" style="min-width: 180px;">
              ${getT().back}
            </button>
          ` : `
            <a href="#/" class="saral-btn btn-ghost" style="min-width: 180px;">
              ← Home
            </a>
          `}
        </div>

        <div>
          ${currentStep < 5 ? `
            <button type="button" id="saral-next-btn" class="saral-btn btn-primary" style="min-width: 220px;">
              ${getT().next}
            </button>
          ` : `
            <button type="button" id="saral-finish-btn" class="saral-btn btn-primary" style="min-width: 280px; background-color: #C85A17; border-color: #8C3B07;">
              ${getT().makePlan}
            </button>
          `}
        </div>
      </div>
    `;

    bindStepInteractions();
  }

  function getStepHTML(step, data, lang) {
    const t = strings[lang];

    if (step === 1) {
      return `
        <div>
          <h1>${t.destQuestion}</h1>
          <p style="font-size: 1.25rem; color: #4B5563; margin-bottom: var(--space-6);">${t.destSub}</p>
          
          <!-- Optional Voice Input Button -->
          <div style="margin-bottom: var(--space-6);">
            <button type="button" id="btn-voice-mic" class="saral-btn btn-ghost" style="width: 100%; border: 3px dashed #0B4F4A; background-color: #F8FCFA;">
              <span id="voice-mic-label">${t.voiceMic}</span>
            </button>
          </div>

          <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-4);" role="radiogroup" aria-label="Destinations">
            ${[
              { id: 'varanasi', name: 'Varanasi', icon: '🛕', desc: 'Holy Ganga Ghats, Kashi Vishwanath, Peaceful Evening Aarti' },
              { id: 'manali', name: 'Manali', icon: '🏔️', desc: 'Snow mountain views, Apple orchards, Calm Burwa village' },
              { id: 'rishikesh', name: 'Rishikesh', icon: '🧘', desc: 'Serene Ganga riverbanks, Ashrams, Gentle breeze' },
              { id: 'jaipur', name: 'Jaipur', icon: '🏰', desc: 'Heritage forts, Handcrafted textiles, Sweet lassi' },
              { id: 'hampi', name: 'Hampi', icon: '🏛️', desc: 'Timeless stone temples, Tungabhadra river, Slow village walks' },
              { id: 'munnar', name: 'Munnar', icon: '🍃', desc: 'Green tea garden hills, Fresh cool mist, Quiet walks' }
            ].map((d) => `
              <button type="button" class="saral-choice-card ${data.destinationId === d.id ? 'selected' : ''}" data-val="${d.name}" data-id="${d.id}" role="radio" aria-checked="${data.destinationId === d.id}">
                <span class="choice-icon">${d.icon}</span>
                <div>
                  <div style="font-size: 1.4rem; color: #0B4F4A;">${d.name}</div>
                  <div style="font-size: 0.95rem; font-weight: normal; color: #4B5563; line-height: 1.4;">${d.desc}</div>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (step === 2) {
      return `
        <div>
          <h1>${t.daysQuestion}</h1>
          <p style="font-size: 1.25rem; color: #4B5563; margin-bottom: var(--space-6);">${t.daysSub}</p>

          <div class="grid" style="grid-template-columns: 1fr; gap: var(--space-4);" role="radiogroup" aria-label="Trip duration">
            ${[
              { days: 1, label: '1 Day Trip', icon: '🌅', desc: 'Quick pilgrimage or simple day-out without staying overnight' },
              { days: 2, label: '2 Days / 1 Night', icon: '🌄', desc: 'Relaxed weekend trip with overnight homestay rest' },
              { days: 3, label: '3 Days / 2 Nights', icon: '🏞️', desc: 'Recommended: Best balance of sights, rest, and local meals' },
              { days: 5, label: '5 Days / 4 Nights', icon: '🏔️', desc: 'Slow, deep holiday exploring nearby offbeat villages' }
            ].map((opt) => `
              <button type="button" class="saral-choice-card ${data.days === opt.days ? 'selected' : ''}" data-val="${opt.days}" role="radio" aria-checked="${data.days === opt.days}">
                <span class="choice-icon">${opt.icon}</span>
                <div>
                  <div style="font-size: 1.35rem; color: #0B4F4A;">${opt.label}</div>
                  <div style="font-size: 1rem; font-weight: normal; color: #4B5563;">${opt.desc}</div>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (step === 3) {
      return `
        <div>
          <h1>${t.budgetQuestion}</h1>
          <p style="font-size: 1.25rem; color: #4B5563; margin-bottom: var(--space-6);">${t.budgetSub}</p>

          <div class="grid" style="grid-template-columns: 1fr; gap: var(--space-4);" role="radiogroup" aria-label="Trip budget">
            ${[
              { tier: 'Low', amount: 6000, label: 'Low Budget (₹3,000 to ₹8,000)', icon: '🟢', desc: 'Clean village homestay room, homemade fresh food, shared local transport' },
              { tier: 'Medium', amount: 14000, label: 'Medium Budget (₹8,000 to ₹20,000)', icon: '🟡', desc: 'Comfortable family cottage, dedicated local guide, private auto/cab' },
              { tier: 'High', amount: 28000, label: 'Comfort / High Budget (₹20,000+)', icon: '🟠', desc: 'Heritage view suite, private AC car, licensed personal guide' }
            ].map((b) => `
              <button type="button" class="saral-choice-card ${data.budgetTier === b.tier ? 'selected' : ''}" data-val="${b.tier}" data-amt="${b.amount}" role="radio" aria-checked="${data.budgetTier === b.tier}">
                <span class="choice-icon">${b.icon}</span>
                <div>
                  <div style="font-size: 1.35rem; color: #0B4F4A;">${b.label}</div>
                  <div style="font-size: 1rem; font-weight: normal; color: #4B5563;">${b.desc}</div>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (step === 4) {
      return `
        <div>
          <h1>${t.prefQuestion}</h1>
          <p style="font-size: 1.25rem; color: #4B5563; margin-bottom: var(--space-6);">${t.prefSub}</p>

          <div class="grid" style="grid-template-columns: 1fr; gap: var(--space-4);" role="radiogroup" aria-label="Travel preferences">
            ${[
              { pref: 'Temples & Spiritual', tag: 'Spiritual', icon: '🛕', desc: 'Peaceful temple darshans, evening aarti, holy river ghats, zero rush' },
              { pref: 'Nature & Hills', tag: 'Nature', icon: '🌲', desc: 'Gentle garden walks, fresh mountain air, birds, scenic viewing seats' },
              { pref: 'Family Sights & Craft', tag: 'Cultural', icon: '👨‍👩‍👧', desc: 'Traditional handloom markets, puppet shows, authentic local sweets' },
              { pref: 'Rest & Pure Peace', tag: 'Relaxed', icon: '🕊️', desc: 'Sitting in veranda, warm chai with hosts, slow quiet mornings' }
            ].map((p) => `
              <button type="button" class="saral-choice-card ${data.preference === p.pref ? 'selected' : ''}" data-val="${p.pref}" data-tag="${p.tag}" role="radio" aria-checked="${data.preference === p.pref}">
                <span class="choice-icon">${p.icon}</span>
                <div>
                  <div style="font-size: 1.35rem; color: #0B4F4A;">${p.pref}</div>
                  <div style="font-size: 1rem; font-weight: normal; color: #4B5563;">${p.desc}</div>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (step === 5) {
      return `
        <div class="flow">
          <h1>${t.reviewTitle}</h1>
          <p style="font-size: 1.25rem; color: #4B5563; margin-bottom: var(--space-6);">
            Please confirm your choices below. We will create a stress-free itinerary with one recommended stay and guide.
          </p>

          <div class="card" style="padding: var(--space-6); border: 3px solid #0B4F4A; background-color: #F8FCFA;">
            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-5);">
              <div>
                <span style="font-size: 1rem; color: #6B7280; font-weight: 700; text-transform: uppercase;">📍 Destination:</span>
                <div style="font-size: 1.6rem; font-weight: 800; color: #0B4F4A;">${data.destination}</div>
              </div>
              <div>
                <span style="font-size: 1rem; color: #6B7280; font-weight: 700; text-transform: uppercase;">🗓️ Duration:</span>
                <div style="font-size: 1.6rem; font-weight: 800; color: #0B4F4A;">${data.days} Days</div>
              </div>
              <div>
                <span style="font-size: 1rem; color: #6B7280; font-weight: 700; text-transform: uppercase;">💰 Budget:</span>
                <div style="font-size: 1.6rem; font-weight: 800; color: #0B4F4A;">${data.budgetTier} (~₹${data.budgetAmount.toLocaleString('en-IN')})</div>
              </div>
              <div>
                <span style="font-size: 1rem; color: #6B7280; font-weight: 700; text-transform: uppercase;">❤️ Preference:</span>
                <div style="font-size: 1.6rem; font-weight: 800; color: #0B4F4A;">${data.preference}</div>
              </div>
            </div>
          </div>

          <div class="card" style="padding: var(--space-4) var(--space-6); background-color: #FEF3C7; border: 2px solid #F59E0B;">
            <p style="margin: 0; font-size: 1.15rem; color: #92400E;">
              ✓ <strong>Elder & Pilgrim Friendly:</strong> Flat ground-floor rooms, minimal walking, verified local assistance.
            </p>
          </div>
        </div>
      `;
    }

    return '';
  }

  function bindStepInteractions() {
    // Read aloud button
    const readBtn = container.querySelector('#saral-read-btn');
    const stopBtn = container.querySelector('#saral-stop-btn');
    const langBtn = container.querySelector('#saral-lang-toggle');
    const helpBtn = container.querySelector('#saral-help-btn');
    const callFamilyBtn = container.querySelector('#saral-call-family-btn');

    readBtn?.addEventListener('click', () => {
      readCurrentStepAloud();
    });

    stopBtn?.addEventListener('click', () => {
      speechAssistant.stop();
      window.YatraApp.showToast('Voice playback stopped');
    });

    langBtn?.addEventListener('click', () => {
      currentLang = currentLang === 'EN' ? 'HI' : 'EN';
      store.setLanguage(currentLang);
      renderCurrentStep();
      window.YatraApp.showToast(`Voice set to: ${currentLang === 'HI' ? 'हिंदी' : 'English'}`);
      readCurrentStepAloud();
    });

    helpBtn?.addEventListener('click', () => {
      openSaralHelpModal(currentStep, currentLang);
    });

    callFamilyBtn?.addEventListener('click', () => {
      openCallFamilyModal(wizardData);
    });

    // Voice input mic for step 1
    const micBtn = container.querySelector('#btn-voice-mic');
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        const micLabel = container.querySelector('#voice-mic-label');
        if (micLabel) micLabel.textContent = getT().listening;
        micBtn.style.backgroundColor = '#FEF3C7';
        micBtn.style.borderColor = '#D97706';

        speechAssistant.startVoiceInput(
          (spokenText) => {
            if (micLabel) micLabel.textContent = getT().voiceMic;
            micBtn.style.backgroundColor = '#F8FCFA';
            micBtn.style.borderColor = '#0B4F4A';

            const lower = spokenText.toLowerCase();
            const cities = [
              { name: 'Varanasi', id: 'varanasi', keys: ['varanasi', 'kashi', 'banaras'] },
              { name: 'Manali', id: 'manali', keys: ['manali', 'kullu'] },
              { name: 'Rishikesh', id: 'rishikesh', keys: ['rishikesh', 'ganga', 'haridwar'] },
              { name: 'Jaipur', id: 'jaipur', keys: ['jaipur', 'pink city'] },
              { name: 'Hampi', id: 'hampi', keys: ['hampi'] },
              { name: 'Munnar', id: 'munnar', keys: ['munnar', 'kerala'] }
            ];

            const found = cities.find((c) => c.keys.some((k) => lower.includes(k)));
            if (found) {
              wizardData.destination = found.name;
              wizardData.destinationId = found.id;
              renderCurrentStep();
              confirmSelection(`${getT().youChose} ${found.name}`);
            } else {
              window.YatraApp.showToast(`Heard "${spokenText}". Please tap your city button.`);
            }
          },
          (err) => {
            if (micLabel) micLabel.textContent = getT().voiceMic;
            micBtn.style.backgroundColor = '#F8FCFA';
            micBtn.style.borderColor = '#0B4F4A';
            window.YatraApp.showToast('Voice input unavailable in this browser. Please tap the button.');
          }
        );
      });
    }

    // Step choice card clicks
    const choiceCards = container.querySelectorAll('.saral-choice-card');
    choiceCards.forEach((card) => {
      card.addEventListener('click', () => {
        choiceCards.forEach((c) => {
          c.classList.remove('selected');
          c.setAttribute('aria-checked', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-checked', 'true');

        if (currentStep === 1) {
          wizardData.destination = card.dataset.val;
          wizardData.destinationId = card.dataset.id;
          confirmSelection(`${getT().youChose} ${wizardData.destination}`);
        } else if (currentStep === 2) {
          wizardData.days = parseInt(card.dataset.val, 10);
          confirmSelection(`${getT().youChose} ${wizardData.days} Days`);
        } else if (currentStep === 3) {
          wizardData.budgetTier = card.dataset.val;
          wizardData.budgetAmount = parseInt(card.dataset.amt, 10);
          confirmSelection(`${getT().youChose} ${wizardData.budgetTier} Budget`);
        } else if (currentStep === 4) {
          wizardData.preference = card.dataset.val;
          wizardData.preferenceTag = card.dataset.tag;
          confirmSelection(`${getT().youChose} ${wizardData.preference}`);
        }
      });
    });

    // Navigation buttons
    const backBtn = container.querySelector('#saral-back-btn');
    backBtn?.addEventListener('click', () => {
      if (currentStep > 1) {
        currentStep--;
        renderCurrentStep();
        readCurrentStepAloud();
      }
    });

    const nextBtn = container.querySelector('#saral-next-btn');
    nextBtn?.addEventListener('click', () => {
      if (currentStep < 5) {
        currentStep++;
        renderCurrentStep();
        readCurrentStepAloud();
      }
    });

    const finishBtn = container.querySelector('#saral-finish-btn');
    finishBtn?.addEventListener('click', () => {
      speechAssistant.stop();
      // Save preferences to store
      store.setState({
        preferences: {
          destination: wizardData.destination,
          destinationName: wizardData.destination,
          destinationId: wizardData.destinationId,
          days: wizardData.days,
          budget: wizardData.budgetAmount,
          mood: wizardData.preferenceTag,
          accessibility: { seniorFriendly: true, minimalWalking: true }
        }
      });
      renderSaralResultsView(container, wizardData, currentLang);
    });
  }

  function confirmSelection(text) {
    const banner = container.querySelector('#saral-choice-confirmation');
    const textEl = container.querySelector('#confirmation-text');
    if (banner && textEl) {
      textEl.textContent = text;
      banner.style.display = 'block';
    }
    // Read confirmation audio
    speechAssistant.speak(text, currentLang);
  }

  function readCurrentStepAloud() {
    let textToSpeak = '';
    const t = getT();

    if (currentStep === 1) {
      textToSpeak = `${t.destQuestion}. ${t.destSub}. You can choose Varanasi, Manali, Rishikesh, Jaipur, Hampi, or Munnar.`;
    } else if (currentStep === 2) {
      textToSpeak = `${t.daysQuestion}. Choose 1 Day, 2 Days, 3 Days, or 5 Days. Currently selected: ${wizardData.days} Days.`;
    } else if (currentStep === 3) {
      textToSpeak = `${t.budgetQuestion}. Choose Low Budget from 3000 to 8000 rupees, Medium Budget from 8000 to 20000 rupees, or High Budget.`;
    } else if (currentStep === 4) {
      textToSpeak = `${t.prefQuestion}. Choose Temples and Spiritual, Nature and Hills, Family Sights, or Rest and Peace.`;
    } else if (currentStep === 5) {
      textToSpeak = `${t.reviewTitle}. You chose ${wizardData.destination} for ${wizardData.days} days, with a ${wizardData.budgetTier} budget, focused on ${wizardData.preference}. Tap Make My Simple Plan to view your schedule.`;
    }

    speechAssistant.speak(textToSpeak, currentLang);
  }

  // Initial render of step 1
  renderCurrentStep();

  return container;
}

/**
 * Saral Results View
 * Collapsible day cards, ONE recommended stay, ONE guide, and single big "Book this" button.
 */
function renderSaralResultsView(container, wizardData, lang) {
  // Fetch sample hosts to get the 1 top stay & 1 top guide
  fetch('data/hosts.json')
    .then((r) => r.json())
    .then((data) => {
      const destId = wizardData.destinationId || 'varanasi';
      const stays = (data.stays || []).filter((s) => s.destination === destId);
      const guides = (data.guides || []).filter((g) => g.destination === destId);

      const topStay = stays[0] || data.stays[0];
      const topGuide = guides[0] || data.guides[0];

      // Save recommended stay and guide into store
      store.setState({
        selectedStay: topStay,
        selectedGuide: topGuide
      });

      renderResultsHTML(container, wizardData, topStay, topGuide, lang);
    })
    .catch(() => {
      // Fallback
      renderResultsHTML(container, wizardData, null, null, lang);
    });
}

function renderResultsHTML(container, wizardData, stay, guide, lang) {
  const stayName = stay ? stay.name : 'Peaceful Community Homestay';
  const stayPrice = stay ? stay.pricePerNight : 1400;
  const guideName = guide ? guide.name : 'Ramesh Sharma';
  const guidePrice = guide ? guide.pricePerDay : 1200;

  const totalEst = (stayPrice * Math.max(1, wizardData.days - 1)) + (guidePrice * wizardData.days);

  container.innerHTML = `
    <!-- Top Return & Voice Bar -->
    <div class="saral-audio-bar flex-between" style="margin-bottom: var(--space-6);">
      <div>
        <span class="badge badge-verified" style="font-size: 1.1rem; padding: 6px 14px;">✓ Simple Plan Ready</span>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn btn-ghost btn-sm" id="btn-read-results" style="min-height: 48px; font-size: 1rem;">
          🔊 Read Plan Aloud
        </button>
        <button type="button" class="btn btn-ghost btn-sm" id="btn-stop-results" style="min-height: 48px; font-size: 1rem;">
          ⏹️ Stop
        </button>
      </div>
    </div>

    <!-- Main Header -->
    <div style="margin-bottom: var(--space-6);">
      <h1 style="color: #0B4F4A; margin-bottom: var(--space-2);">
        Your Peaceful ${wizardData.days}-Day Plan for ${wizardData.destination}
      </h1>
      <p style="font-size: 1.25rem; color: #4B5563;">
        Designed with zero rush, senior-friendly ground floor stays, and verified local guide assistance.
      </p>
    </div>

    <!-- Cost Summary Card -->
    <div class="card" style="padding: var(--space-5); border: 3px solid #0B4F4A; background-color: #F8FCFA; margin-bottom: var(--space-8);">
      <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-3); align-items: center;">
        <div>
          <span style="font-size: 1.05rem; color: #6B7280; font-weight: 700;">TOTAL ESTIMATED COST:</span>
          <div style="font-size: 2.2rem; font-weight: 800; color: #0B4F4A;">
            ₹${totalEst.toLocaleString('en-IN')}
          </div>
          <span style="font-size: 1rem; color: #15803D; font-weight: 700;">
            ✓ Within your ₹${wizardData.budgetAmount.toLocaleString('en-IN')} budget
          </span>
        </div>
        <div>
          <a href="#/booking" class="saral-btn btn-primary" style="background-color: #C85A17; border-color: #8C3B07; font-size: 1.35rem; padding: 18px 36px;">
            Book This Simple Plan ➔
          </a>
        </div>
      </div>
    </div>

    <!-- Daily Collapsible Day Cards -->
    <section style="margin-bottom: var(--space-8);">
      <h2 style="color: #0B4F4A; margin-bottom: var(--space-4);">Daily Sightseeing Schedule</h2>
      
      <div class="flow" style="gap: var(--space-4);">
        ${Array.from({ length: wizardData.days }).map((_, i) => {
          const dayNum = i + 1;
          return `
            <div class="card" style="border: 2.5px solid #D1D5DB; overflow: hidden;">
              <button type="button" class="saral-day-toggle flex-between" data-day="${dayNum}" style="width: 100%; padding: var(--space-5); background-color: #FFFFFF; border: none; cursor: pointer; text-align: left; font-size: 1.35rem; font-weight: 800; color: #0B4F4A;">
                <span>🗓️ Day ${dayNum}: ${getDayTitle(wizardData.destination, dayNum)}</span>
                <span class="day-toggle-arrow">▼</span>
              </button>
              <div class="saral-day-body" id="day-body-${dayNum}" style="padding: 0 var(--space-5) var(--space-5); display: ${dayNum === 1 ? 'block' : 'none'}; border-top: 1px solid #E5E7EB;">
                <div class="flow" style="margin-top: var(--space-4); font-size: 1.15rem;">
                  <div style="background-color: #F9FAFB; padding: var(--space-3) var(--space-4); border-left: 4px solid #0B4F4A; border-radius: 8px;">
                    <strong>🌅 Morning (9:30 AM – 11:30 AM):</strong>
                    <p style="margin: 4px 0 0; color: #374151;">${getDayMorning(wizardData.destination, dayNum)}</p>
                  </div>
                  <div style="background-color: #F9FAFB; padding: var(--space-3) var(--space-4); border-left: 4px solid #D97706; border-radius: 8px;">
                    <strong>☀️ Afternoon & Evening (4:30 PM – 6:30 PM):</strong>
                    <p style="margin: 4px 0 0; color: #374151;">${getDayEvening(wizardData.destination, dayNum)}</p>
                  </div>
                  <p style="font-size: 1rem; color: #15803D; margin-top: var(--space-2);">
                    💡 <em>Elder tip: Rest periods between 12:00 PM and 4:00 PM to avoid heat and walking fatigue.</em>
                  </p>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </section>

    <!-- ONE Recommended Homestay & ONE Guide Section -->
    <section class="grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-6); margin-bottom: var(--space-8);">
      
      <!-- Recommended Homestay -->
      <div class="card flow" style="border: 3px solid #0B4F4A; padding: var(--space-5);">
        <div class="flex-between">
          <span class="badge badge-verified">🏡 Recommended Homestay</span>
          <span style="font-weight: 700; color: #0B4F4A;">₹${stayPrice}/night</span>
        </div>
        <h3 style="margin: var(--space-2) 0 0; font-size: 1.5rem; color: #0B4F4A;">${stayName}</h3>
        <p style="font-size: 1.1rem; color: #4B5563; margin: 0;">📍 ${stay ? stay.area : 'Quiet Village'}</p>
        
        <div style="background-color: #FEF3C7; padding: var(--space-3); border-radius: 10px; font-size: 1rem; color: #92400E;">
          ✓ Ground floor room (Zero stairs)<br>
          ✓ Warm freshly cooked sattvic / homestyle meals<br>
          ✓ 24/7 hot water & personal host assistance
        </div>

        <p style="font-size: 1.05rem; color: #374151;">
          <em>${stay ? stay.hostStory : 'Quiet family atmosphere where elderly visitors receive warm personal attention.'}</em>
        </p>
      </div>

      <!-- Recommended Guide -->
      <div class="card flow" style="border: 3px solid #0B4F4A; padding: var(--space-5);">
        <div class="flex-between">
          <span class="badge badge-verified">🪪 Verified Local Guide</span>
          <span style="font-weight: 700; color: #0B4F4A;">₹${guidePrice}/day</span>
        </div>
        <h3 style="margin: var(--space-2) 0 0; font-size: 1.5rem; color: #0B4F4A;">${guideName}</h3>
        <p style="font-size: 1.1rem; color: #4B5563; margin: 0;">🎓 ${guide ? guide.yearsExperience : 15} Years Certified Experience</p>

        <div style="background-color: #E6F4F1; padding: var(--space-3); border-radius: 10px; font-size: 1rem; color: #0B4F4A;">
          ✓ Fluent in Hindi & English<br>
          ✓ Guides slow walking groups with battery rickshaw arrangements<br>
          ✓ Pre-arranged temple darshan passes without long queues
        </div>

        <p style="font-size: 1.05rem; color: #374151;">
          <em>${guide ? guide.bioStory : 'Patience-driven guide who takes immense pride in sharing cultural roots with elders.'}</em>
        </p>
      </div>
    </section>

    <!-- Saral Mode Interactive Map Section -->
    <section class="card flow" style="border: 3px solid #0B4F4A; padding: var(--space-5); margin-bottom: var(--space-8);">
      <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-3); align-items: center;">
        <div>
          <h3 style="margin: 0; font-size: 1.5rem; color: #0B4F4A;">🗺️ ${lang === 'HI' ? 'नक्शे पर देखें' : 'Simple Travel Map'}</h3>
          <p style="margin: 4px 0 0; font-size: 1.05rem; color: #4B5563;">
            ${lang === 'HI' ? 'बड़े बटनों और स्पष्ट दिशा-निर्देशों के साथ' : 'Large easy-to-read markers and walking locations'}
          </p>
        </div>
        <button type="button" id="btn-saral-toggle-map" class="saral-btn btn-primary" style="background-color: #0B4F4A; border-color: #042F2C; font-size: 1.15rem; padding: 12px 24px; min-height: 56px;">
          🗺️ ${lang === 'HI' ? 'नक्शा खोलें / बंद करें' : 'Show on Map'}
        </button>
      </div>

      <div id="saral-map-container-wrap" style="display: none; margin-top: var(--space-4);">
        <div id="saral-map" class="yatra-map-container" style="height: 380px;" role="region" aria-label="Simple interactive travel map"></div>
        <div style="background: #F8FAFC; padding: 10px 14px; border-radius: 8px; margin-top: 8px; font-size: 0.95rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
          <span>🏡 ${stayName} • 🎓 ${guideName}</span>
          <a href="${stay?.lat ? getDirectionsUrl(stay.lat, stay.lng, stayName) : '#'}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="font-size: 0.9rem; font-weight: 700;">
            🚗 Open Driving Directions ↗
          </a>
        </div>
      </div>
    </section>

    <!-- Big Action Buttons Footer -->
    <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-4); padding-top: var(--space-6); border-top: 3px solid #E5E7EB;">
      <a href="#/saral" class="saral-btn btn-ghost" style="min-width: 220px;">
        ↺ Change Choices
      </a>
      <a href="#/booking" class="saral-btn btn-primary" style="background-color: #C85A17; border-color: #8C3B07; font-size: 1.35rem; padding: 18px 40px;">
        Book This Simple Plan ➔
      </a>
    </div>
  `;

  // Bind day accordion clicks
  container.querySelectorAll('.saral-day-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dayNum = btn.dataset.day;
      const body = container.querySelector(`#day-body-${dayNum}`);
      const arrow = btn.querySelector('.day-toggle-arrow');
      if (body) {
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'block' : 'none';
        if (arrow) arrow.textContent = isHidden ? '▲' : '▼';
      }
    });
  });

  // Saral Mode Map Toggle and Initialization
  const btnToggleMap = container.querySelector('#btn-saral-toggle-map');
  const mapWrap = container.querySelector('#saral-map-container-wrap');
  let saralMapInstance = null;

  btnToggleMap?.addEventListener('click', () => {
    if (!mapWrap) return;
    const isHidden = mapWrap.style.display === 'none';
    mapWrap.style.display = isHidden ? 'block' : 'none';

    if (isHidden) {
      if (!saralMapInstance) {
        const saralMapEl = container.querySelector('#saral-map');
        const defaultLat = stay?.lat || 25.3176;
        const defaultLng = stay?.lng || 82.9739;
        saralMapInstance = new YatraMap(saralMapEl, {
          center: [defaultLat, defaultLng],
          zoom: 13,
          isSaral: true
        });
        saralMapInstance.init();

        const mapItems = [];
        if (stay) mapItems.push(stay);
        if (guide) mapItems.push(guide);

        saralMapInstance.renderStaysAndGuides(mapItems);
      } else {
        saralMapInstance.invalidateSize();
      }
    }
  });

  // Read results aloud
  container.querySelector('#btn-read-results')?.addEventListener('click', () => {
    const text = `Here is your simple plan for ${wizardData.destination}. A ${wizardData.days} day trip with an estimated total cost of ${totalEst} rupees, including your homestay at ${stayName} and certified guide ${guideName}. Tap the big Book This Simple Plan button to confirm.`;
    speechAssistant.speak(text, lang);
  });

  container.querySelector('#btn-stop-results')?.addEventListener('click', () => {
    speechAssistant.stop();
  });
}

function getDayTitle(dest, day) {
  if (dest === 'Varanasi') {
    return day === 1 ? 'Kashi Vishwanath Darshan & Quiet Ghats' : day === 2 ? 'Sarnath Stupa & Silk Weavers' : 'Assi Ghat Morning Bhajan';
  } else if (dest === 'Manali') {
    return day === 1 ? 'Burwa Apple Orchard Walk' : day === 2 ? 'Naggar Castle & Heritage Art' : 'Vashisht Warm Spring Dip';
  } else if (dest === 'Rishikesh') {
    return day === 1 ? 'Parmarth Niketan & Evening Ganga Aarti' : day === 2 ? 'Beatles Ashram Nature Walk' : 'Vashishta Cave Meditation';
  } else if (dest === 'Jaipur') {
    return day === 1 ? 'City Palace Ground Tour' : day === 2 ? 'Amer Fort Low-Incline Ride' : 'Albert Hall Garden Stroll';
  } else {
    return `Day ${day} Peaceful Sights`;
  }
}

function getDayMorning(dest, day) {
  if (dest === 'Varanasi') {
    return day === 1 ? 'Easy battery rickshaw ride to Vishwanath corridor with VIP senior darshan pass.' : 'Shaded walk around Sarnath deer park and ancient Ashoka pillar.';
  } else if (dest === 'Manali') {
    return day === 1 ? 'Gentle stroll through Burwa apple orchard. Fresh warm Siddu snack.' : 'Woodcraft demonstration at ancient Naggar heritage courtyard.';
  } else {
    return 'Comfortable morning sight with bench seating and shade. Minimal walking.';
  }
}

function getDayEvening(dest, day) {
  if (dest === 'Varanasi') {
    return day === 1 ? 'Reserved seated boat ride to watch Ganga Aarti without crowd rush.' : 'Visit traditional Banarasi silk weavers in peaceful weavers colony.';
  } else if (dest === 'Manali') {
    return day === 1 ? 'Relaxed veranda tea with Thakur host family as sun sets behind peaks.' : 'Visit Roerich Himalayan art estate.';
  } else {
    return 'Pleasant sunset viewing with warm chai and local cultural performance.';
  }
}

function openSaralHelpModal(step, lang) {
  const content = `
    <div class="flow" style="font-size: 1.25rem; line-height: 1.6;">
      <p><strong>Need help with Step ${step}?</strong></p>
      <p>1. Simply tap the large box that best matches what you want.</p>
      <p>2. Tap the <strong>"🔊 Read Aloud"</strong> button at top to hear instructions.</p>
      <p>3. If you want a family member to help you book, tap the <strong>"📞 Call Family Member"</strong> button.</p>
      <div style="margin-top: var(--space-6); text-align: right;">
        <button type="button" class="saral-btn btn-primary" onclick="window.YatraApp.closeModal()">I Understand ✓</button>
      </div>
    </div>
  `;
  window.YatraApp.openModal({
    title: 'Saral Mode Help',
    content
  });
  speechAssistant.speak(`Need help with Step ${step}? Simply tap the large box you like, or tap Read Aloud to hear the options.`, lang);
}

function openCallFamilyModal(wizardData) {
  const sosSettings = (store.getSosSettings && store.getSosSettings()) || {};
  const contacts = sosSettings.emergencyContacts || [];
  const primary = contacts[0] || {
    name: 'Rohit Sharma',
    relation: 'Son',
    phone: '+91 98765 43210'
  };

  const content = `
    <div class="flow" style="font-size: 1.2rem;">
      <div style="background-color: #FEF3C7; padding: var(--space-4); border-radius: 12px; border: 2px solid #F59E0B;">
        <p style="margin: 0; color: #92400E; font-weight: 700;">
          👨‍👩‍👧 Family Companion Assistance
        </p>
        <p style="margin: 6px 0 0; color: #78350F; font-size: 1.05rem;">
          Connect directly with your registered emergency contact who can review or help complete this booking on your behalf.
        </p>
      </div>

      <div class="card" style="padding: var(--space-4); border: 2px solid #D1D5DB;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; color: #0B4F4A;">Designated Companion:</span>
          <a href="#/sos" onclick="window.YatraApp.closeModal()" style="font-size: 0.9rem; color: #0B4F4A; font-weight: 700; text-decoration: underline;">
            ✏️ Change in SOS
          </a>
        </div>
        <div style="font-size: 1.35rem; font-weight: 800; color: #111827; margin: 4px 0;">${primary.name} (${primary.relation})</div>
        <div style="font-size: 1.1rem; color: #15803D; font-weight: 700;">📱 ${primary.phone}</div>
      </div>

      <div class="flow" style="margin-top: var(--space-4);">
        <a href="tel:${primary.phone.replace(/[^0-9+]/g, '')}" class="saral-btn btn-primary" style="width: 100%; text-decoration: none; text-align: center;" onclick="window.YatraApp.showToast('📞 Dialing ${primary.name} (${primary.phone})...'); window.YatraApp.closeModal();">
          📞 Call ${primary.name} Now
        </a>
        <a href="https://api.whatsapp.com/send?phone=${primary.phone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent('Namaste! I am planning a trip on YatraLocal and need your assistance.')}" target="_blank" rel="noopener noreferrer" class="saral-btn btn-secondary" style="width: 100%; text-decoration: none; text-align: center;" onclick="window.YatraApp.closeModal();">
          💬 Send WhatsApp Message
        </a>
        <button type="button" class="saral-btn btn-ghost" style="width: 100%;" onclick="window.YatraApp.closeModal()">
          Close
        </button>
      </div>
    </div>
  `;

  window.YatraApp.openModal({
    title: 'Call a Family Member',
    content
  });
}
