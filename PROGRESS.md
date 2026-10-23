# YatraLocal — Development Progress & Phase Checklist

Track progress across all 14 project phases.

---

## 📋 Phase Roadmap

- [x] **Phase 1: Design system & app shell**
  - Tokenized design system (CSS variables, typography, colors, responsive grid).
  - Semantic HTML shell with header, responsive navigation, toast/modal layer, and router container.
  - Client-side vanilla hash router and reactive local store (`localStorage`).

- [x] **Phase 2: Landing + trip form**
  - Hero section communicating the core mission with visible placeholder `[Add verified statistic + source]`.
  - Multi-input trip preference form (budget, trip length/days, travel mood, accessibility needs).
  - Form validation, instant state persistence, and transition to itinerary view.

- [x] **Phase 3: Itinerary engine**
  - Day-wise itinerary generator algorithm with crowdsourced offbeat spots.
  - Crowd-avoidance recommendations (off-peak hours, hidden gems).
  - Cost breakdowns, filterable days, and interactive activity schedule.

- [x] **Phase 4: Stays & guides**
  - Verified local homestay and boutique hotel directory with off-season discount tags.
  - Verified local guides directory with spoken languages, badges, and specialties.
  - Filter by budget, location, amenities, and senior-friendliness.

- [x] **Phase 5: Saral Mode**
  - High-visibility global toggle in header and landing page, adding `.saral` to `<html>` and persisting in `localStorage`.
  - High-contrast accessible styling: 22px+ base font, min 64px button height, zero visual clutter, large icons.
  - Simplified 5-step wizard (Destination with optional voice input, Days, Budget, Preferences, Review).
  - Web Speech API integration (`SpeechSynthesis` in EN/HI + graceful fallback, `SpeechRecognition` voice input, Read Aloud & Stop buttons).
  - Persistent Help modal and "Call a Family Member" simulation (phone & WhatsApp).
  - Simplified results page: collapsible day cards, ONE homestay, ONE guide, and single big "Book this" CTA.
  - **Manual QA Checklist (Keyboard & 200% Zoom)**:
    - [x] Keyboard-only Tab navigation across all 5 steps with visible 4px golden focus rings (`outline: 4px solid #D97706`).
    - [x] 200% browser zoom verification: zero text clipping or horizontal layout overflow.
    - [x] Web Speech narration: "Read Aloud" reads active step; "Stop" halts speech; language toggle switches to Hindi (`hi-IN`).
    - [x] Selection audio feedback: announces confirmation ("You chose Varanasi").
    - [x] Family Call modal: opens on click, simulates companion direct call & WhatsApp dispatch.

- [x] **Phase 6: Booking + family-assisted flow**
  - 5-step stepper: 1 Review trip (90% local-income retention calculation) → 2 Traveller details → 3 Who is booking? → 4 Confirm (demo payment & cancellation policy) → 5 Confirmation voucher.
  - "Book for Family Member / Elder" flow with companion contact details, clear authorization consent, simulated SMS approval dispatch, and mirrored updates.
  - Digital voucher with SVG QR placeholder, downloadable standard `.ics` iCalendar file, WhatsApp deep link, and copy link shortcut.
  - Persistent booking ledger in `localStorage` with "My Trips" dashboard at `#/trips`.
  - Full Saral Mode compatibility with voice prompts (`SpeechSynthesis`).

- [x] **Phase 7: Hotel Owner Dashboard**
  - Portal for local homestay/hotel hosts (`#/owner`) with simulated demo login for Uncle Ramesh Thakur (Manali homestay, 8 rooms, 6 empty off-season).
  - Dynamic KPI cards: 25% occupancy, 6 vacant rooms, 90% direct payout net estimate, and off-season gap tracker.
  - Zero-dependency SVG seasonality bar chart and congestion vs. village demand shift line chart marked `[Sample data]`.
  - Interactive Off-Season Flash Offer Builder with live preview and instant synchronization to `#/stays` promotion ribbons.
  - Rule-based AI suggestions panel with `[Simulated AI]` badge.
  - Incoming guest booking ledger with direct bookings and 90% payout status.
  - Fair tourism monetization & subscription teaser card marked `[Concept / Business Model]`.
  - 5/5 automated unit tests passing in `tests/owner.test.html`.

- [ ] **Phase 8: Safety SOS**
  - Prominent emergency SOS floating button & panel.
  - Geolocation capture (`navigator.geolocation`) with one-click WhatsApp/SMS emergency dispatch format.
  - Local emergency helpline directory (Police 112, Women Helpline 1091, Tourist Helpline 1363).

- [ ] **Phase 9: Accessibility, polish & QA**
  - WCAG 2.1 AA audit (contrast ratios, focus visible rings, keyboard navigability).
  - ARIA landmark audit and screen-reader compatibility.
  - Responsive testing (mobile 360px up to desktop 1440px).

- [ ] **Phase 10: Deploy, README & demo script**
  - Deployment configuration for static hosting.
  - Step-by-step judge/demo presentation script.
  - Thorough testing instructions and offline fallback validation.

- [ ] **Phase 11: Real map integration**
  - Interactive map integration (Leaflet/OpenStreetMap or Google Maps Platform proxy via `/api/map`).
  - Pinning destinations, homestays, and crowd indicators.
  - Graceful fallback to static map cards when offline or unconfigured.

- [ ] **Phase 12: Real AI integration**
  - Serverless endpoint `/api/ai` connecting to Gemini API with safe proxying.
  - Dynamic AI itinerary generation and personalized local suggestions.
  - Seamless fallback to local deterministic itinerary engine if API keys are missing.

- [ ] **Phase 13: Real SOS integration**
  - Live location beacon backend proxy `/api/sos`.
  - Shareable emergency link generator with real coordinates and timestamp.
  - Safe simulated fallback when offline.

- [ ] **Phase 14: Final redeploy & verification**
  - End-to-end verification of all flows.
  - Final audit of offline fallbacks, labels ("Demo / Simulated"), and statistics placeholders.
