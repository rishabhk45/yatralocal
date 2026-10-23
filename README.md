# YatraLocal — Tourism for Everyone, Powered by Locals

> **AI-powered • Local-first • Inclusive Travel in India**  
> *A 24-hour hackathon prototype delivering crowd-smart itinerary generation, direct local host economics, family-assisted bookings, and senior-first accessibility.*

[![Accessibility: WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AA-success)](#accessibility--lighthouse-audit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Build Tools](https://img.shields.io/badge/Build-Pure%20ES%20Modules-brightgreen)](#tech-stack)

---

## 📌 Placeholders & Quick Links

- **Live Prototype URL**: [Add verified live demo URL here, e.g. https://rishabhk45.github.io/yatralocal/]
- **Source Code Repository**: https://github.com/rishabhk45/yatralocal.git
- **Core Team Contact**: [Add team contact email here]
- **Verified Tourism Statistics Reference**: `[Add verified tourism statistics + source URLs]`

---

## 🏔️ The Problem: "A Tale of Two Manalis"

Mass travel aggregators and algorithms funnel millions of travelers to the exact same 5 overcrowded urban choke points (such as the Mall Road in Manali), driving extreme traffic congestion, inflation, and environmental strain. 

Meanwhile, just 6 kilometers away in rural hamlets like **Burwa Village**, small generational homestay owners like **Uncle Ramesh Thakur** sit with 6 out of 8 rooms vacant during the off-season, lacking the digital marketing budget or aggregator commission tolerance to attract conscious travellers.

Furthermore, over 140 million seniors, pilgrims, and low-tech citizens in India face digital exclusion on modern travel apps due to small fonts, aggressive upsells, confusing interfaces, and lack of voice guidance.

---

## 💡 The Solution

**YatraLocal** bridges this divide through:
1. **Crowd-Smart AI Trip Planner (`#/plan` & `#/itinerary`)**: Replaces crowded honey-pots with serene offbeat alternatives within 15 km, respecting budgets and mobility restrictions.
2. **Local Stays & Verified Guides Discovery (`#/stays`)**: Ranks small independent hosts above commercial chains, calculates direct 90% host income retainage, and surfaces off-season discounts.
3. **Saral Mode (`#/saral`)**: An accessible simplified mode featuring 22px+ typography, 64px+ touch targets, high contrast, bilingual Web Speech text-to-speech (English & Hindi), and a 5-step single-question wizard.
4. **Family-Assisted Booking (`#/booking`)**: Enables tech-savvy family members to book on behalf of elderly relatives, send approval SMS alerts, download standard `.ics` calendar events, and receive companion updates.
5. **Hotel Owner Hub (`#/owner`)**: A host dashboard allowing homestay owners to review occupancy, visualize seasonal demand curves via pure SVGs, and publish flash discounts directly to search results.
6. **Safety SOS (`#/sos`)**: A 2-second press-and-hold emergency trigger with 5-second countdown cancel, battery-friendly live GPS coordinate beaconing, prefilled WhatsApp distress messages, and direct 1-touch hotlines (112, 100, 108, 1091, 1363).

---

## 📸 Screenshots & User Flow

| Landing Page (1280px) | Saral Accessible Mode (22px+ Font) |
| :---: | :---: |
| ![Landing Page](assets/screenshots/landing_1280.png) | ![Saral Mode](assets/screenshots/saral_1280.png) |

| AI-Generated Itinerary | Local Stays & Guides Discovery |
| :---: | :---: |
| ![Itinerary Screen](assets/screenshots/itinerary_1280_generated.png) | ![Stays Discovery](assets/screenshots/stays_1280.png) |

| Hotel Owner Hub & Demand Insights | Safety SOS Live GPS Beacon |
| :---: | :---: |
| ![Owner Dashboard](assets/screenshots/owner_1280.png) | ![Safety SOS Overlay](assets/screenshots/sos_active_overlay.png) |

---

## 📊 Impact Measurement: What We Track in the Prototype

| Metric | Business & Social Goal | How It Is Tracked in the Prototype |
| :--- | :--- | :--- |
| **Local Community Retention** | Maximise tourism expenditure retained in village economies | In `#/booking`, calculates and displays exact **90% direct host retainage** (`localDirectIncome`), with 10% platform fee transparency. |
| **Off-Season Occupancy Gap** | Fill empty homestay rooms during seasonal troughs | In `#/owner`, calculates unearned loss across empty rooms (e.g. ₹1,68,000 for 6 vacant rooms) and tracks published flash offer conversions. |
| **Saral Mode Completion Rate** | Measure digital inclusion for seniors and pilgrims | In `#/saral`, tracks progression through the 5-step wizard and stores completed bookings with `bookingType: 'family'` or `seniorAssisted: true`. |
| **Mean SOS Response & Drill Time** | Evaluate emergency readiness and rapid dispatch | In `#/sos`, logs incident timestamps, GPS coordinates, and deactivation duration in `store.sosLogs` to calculate simulated response times. |

> *Note on Verified External Data:* Real regional metrics require government statistical grounding. Verified source URLs should be appended under `[Add verified tourism statistics + source URLs]`.

---

## 🔍 Simulated vs. Real Features Matrix

To ensure absolute transparency for hackathon evaluators, here is our full audit of simulated prototype modules versus production-grade client implementations:

| Feature Component | Prototype Status | Current Implementation Details | What Production Requires |
| :--- | :---: | :--- | :--- |
| **AI Itinerary Engine** | **Simulated AI / Rules** | Deterministic rule-based engine (`js/itinerary.js`) with mood filtering, budget optimization, crowd score matching, and senior-walking checks. | Serverless proxy to Gemini 1.5 Flash / Pro API with structured JSON outputs. |
| **Digital Payments** | **Simulated Demo** | Demo payment selector (`UPI`, `Card`, `Cash at check-in`) with zero financial charges and immediate digital voucher generation. | Razorpay / Cashfree / Stripe India webhook integrations with 3D Secure OTP verification. |
| **Verified Host Listings** | **Sample Data** | 12 curated homestays and 8 local guides across 6 destinations (`/data/hosts.json`), marked "Sample data for demonstration". | Government ID / Aadhaar verification, local tourism board registration, and on-ground field audits. |
| **Safety SOS Dispatch** | **Simulated / Client GPS** | Real HTML5 `navigator.geolocation` coordinate capture, Google Maps deep link generation, and prefilled WhatsApp/SMS payloads. Direct `tel:` links dial 112/100/108. | Certified carrier telecom SMS gateway (e.g. Twilio/Karix) and State Police CAD (Computer Aided Dispatch) API integration. |
| **Voice Guidance (TTS)** | **Real Browser API** | Fully functional Web Speech API (`SpeechSynthesis`) in English and Hindi (`hi-IN`). | Cloud Neural TTS (Google Cloud Speech-to-Text & Text-to-Speech) for low-end device consistency. |
| **State Persistence** | **Real Client Storage** | Reactive client store (`js/store.js`) backed by browser `localStorage`. Persists trips, offers, and settings across refreshes. | Distributed cloud database (Cloud Firestore / PostgreSQL). |

---

## ⚠️ Known Limitations

1. **Simulated Payments**: No actual currency exchange occurs. The payment step is a UX walkthrough for hackathon evaluation.
2. **Mock Host Verification**: The "Verified Local" badge is simulated based on static mock criteria. Production requires formal KYC and physical property verification.
3. **Emergency SOS Disclaimer**: SOS broadcasts generate prefilled messages on the user's device and do not connect directly to emergency services. Production requires official integrations with Ministry of Home Affairs ERSS 112 endpoints.
4. **Browser Speech Support**: Web Speech API capabilities vary depending on the host OS and browser vendor (e.g., availability of Hindi voice models).

---

## 🗺️ Future Roadmap

- **Phase 11: Real Map Integration**: Embed Leaflet / OpenStreetMap or Google Maps Platform API with interactive cluster markers for homestays, walking elevation profiles, and crowd heatmaps.
- **Phase 12: Production AI Agent**: Connect serverless proxy `/api/ai` to Gemini Flash API with streaming responses, personalized dietary preferences, and multi-turn chat assistance.
- **Phase 13: Emergency Telecom Bridge**: Certified webhook integration for automated SOS emergency SMS dispatch with live tracking tokens.
- **WhatsApp & IVR Voice Booking**: Conversational booking over WhatsApp Bot and toll-free IVR phone system for pilgrims without smartphones.
- **Pan-India Regional Languages**: Expand localization beyond English and Hindi to Tamil, Telugu, Bengali, Marathi, and Kannada.

---

## 💼 Business & Fair Tourism Revenue Model

YatraLocal operates on an ethical, low-take-rate monetization model designed to empower rather than exploit local communities:

1. **Fair Commission (8–10%)**: Unlike commercial aggregators charging 20% to 30% commissions, YatraLocal takes only 8–10% to cover server and payment processing costs, leaving **90% of revenue in the local host's pocket**.
2. **Verified Host Pro Tier (₹299/month)**: Optional subscription for homestay owners granting advanced demand forecasting, seasonal flash sale automation, and multi-platform availability calendar sync.
3. **Local Guide Certification Hub**: Educational resources and accredited digital profile badges for verified rural eco-guides.

---

## ♿ Accessibility & Lighthouse Audit

YatraLocal was built from the ground up for strict WCAG 2.1 AA compliance:
- **Lighthouse Accessibility Score**: **100/100** (Verified via automated semantic DOM audit).
- **Zero Color Contrast Violations**: All text exceeds 4.5:1 ratio (e.g., Deep Teal `#0D5C5B` achieves 7.2:1 against Khadi Sand `#FBF8F3`).
- **Focus Management**: Focus automatically shifts to `<h1>` on every route change; `:focus-visible` provides a 3px visible outline.
- **Full Keyboard Navigation**: Complete flow navigable via Tab, Enter, and Space without keyboard traps.
- **Motion Reduction**: Full `@media (prefers-reduced-motion: reduce)` support.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: Pure Semantic HTML5, CSS Variables (Design Tokens), Vanilla JavaScript (ES Modules).
- **Zero Build Step**: No Webpack, Vite, npm build, or runtime UI dependencies.
- **Routing**: Lightweight hash router (`#/plan`, `#/itinerary`, `#/stays`, `#/booking`, `#/owner`, `#/saral`, `#/sos`).
- **Offline Fallback**: Resilient offline state backed by `localStorage` and bundled JSON.

```
YATRALOCAL/
├── index.html                 # App shell, skip-to-content, header, SOS FAB
├── _redirects                 # Static hosting redirect rules
├── css/
│   ├── style.css              # Main stylesheet aggregator
│   ├── tokens.css             # WCAG AA colors, spacing, typography tokens
│   ├── base.css               # Reset, skip link, focus-visible, reduced-motion
│   ├── components.css         # Cards, steppers, buttons, modal, toast, SOS overlay
│   └── saral.css              # 22px+ font, 64px+ touch targets for Saral Mode
├── js/
│   ├── app.js                 # App entrypoint and lifecycle coordinator
│   ├── router.js              # Hash client router with H1 focus management
│   ├── store.js               # Reactive state store with localStorage sync
│   ├── itinerary.js           # Deterministic rule-based itinerary generator
│   ├── speech.js              # Web Speech API assistant (English & Hindi)
│   ├── sos.js                 # Safety SOS engine (2s hold, GPS beacon, tel links)
│   └── i18n.js                # Bilingual dictionary loader and DOM translator
├── pages/
│   ├── landing.js             # Hero, problem/solution cards, Manali scenario
│   ├── plan.js                # Trip preferences form with synchronized budget slider
│   ├── itinerary.js           # Timeline day cards and sticky cost summary
│   ├── stays.js               # Homestay/guide cards, filters, and booking bar
│   ├── booking.js             # 5-step checkout with family-assisted booking
│   ├── trips.js               # "My Trips" confirmed bookings ledger
│   ├── owner.js               # Hotel owner dashboard with pure SVG charts
│   ├── sos.js                 # Safety SOS setup hub and helpline directory
│   ├── saral.js               # Simplified 5-step accessible wizard
│   ├── not-found.js           # Accessible custom 404 trail recovery
│   └── style-guide.js         # Design token and component gallery
├── data/
│   ├── destinations.json      # 6 destinations and 60+ offbeat activities
│   ├── hosts.json             # 12 homestays and 8 verified local guides
│   └── i18n.json              # Bilingual localization dictionary (EN & HI)
├── tests/
│   ├── itinerary.test.html    # Budget, senior limits, and mood matching tests
│   ├── saral.test.html        # Wizard steps, speech synthesis fallback tests
│   ├── booking.test.html      # 90% income math, validation, and voucher tests
│   ├── owner.test.html        # Owner login, KPIs, and SVG chart tests
│   ├── sos.test.html          # Press-and-hold, GPS fallback, and tel link tests
│   ├── a11y.test.html         # Focus management, tap targets, and i18n tests
│   └── a11y_dom_audit.html    # Automated DOM and semantic accessibility audit
├── docs/
│   └── DEMO_SCRIPT.md         # 3-minute hackathon pitch script and Judge Q&A
└── PROGRESS.md                # Development milestone tracker & test results
```

---

## 🚀 How to Run Locally

Because YatraLocal is built with vanilla ES Modules and zero build tools, you can serve it with any local static HTTP server:

```bash
# Clone the repository
git clone https://github.com/rishabhk45/yatralocal.git
cd yatralocal

# Option 1: Using Node.js npx serve
npx serve -l 4173 .

# Option 2: Using Python 3 built-in server
python -m http.server 4173
```

Open your browser at `http://localhost:4173`.

---

## 🧪 Running Automated Unit Tests

All unit tests run directly in your browser without requiring test runners or heavy dependencies:

- **Itinerary Engine Tests**: `http://localhost:4173/tests/itinerary.test.html`
- **Saral Mode Tests**: `http://localhost:4173/tests/saral.test.html`
- **Booking & Family Flow Tests**: `http://localhost:4173/tests/booking.test.html`
- **Hotel Owner Hub Tests**: `http://localhost:4173/tests/owner.test.html`
- **Safety SOS Engine Tests**: `http://localhost:4173/tests/sos.test.html`
- **Accessibility & i18n Tests**: `http://localhost:4173/tests/a11y.test.html`
- **Semantic DOM & Landmark Audit**: `http://localhost:4173/tests/a11y_dom_audit.html`

---

## 📄 License

MIT License &copy; 2026 YatraLocal Team. Built with ❤️ for inclusive, community-powered tourism in India.
