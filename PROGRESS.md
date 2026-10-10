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

- [ ] **Phase 3: Itinerary engine**
  - Day-wise itinerary generator algorithm with crowdsourced offbeat spots.
  - Crowd-avoidance recommendations (off-peak hours, hidden gems).
  - Cost breakdowns, filterable days, and interactive activity schedule.

- [ ] **Phase 4: Stays & guides**
  - Verified local homestay and boutique hotel directory with off-season discount tags.
  - Verified local guides directory with spoken languages, badges, and specialties.
  - Filter by budget, location, amenities, and senior-friendliness.

- [ ] **Phase 5: Saral Mode**
  - High-visibility toggle for Saral Mode.
  - Ultra-large touch targets (min 48-56px), simplified typography, high-contrast palette.
  - Web Speech API integration for text-to-speech / voice guidance.
  - One-click simplified booking shortcuts.

- [ ] **Phase 6: Booking + family-assisted flow**
  - Simulated booking modal with instant confirmation and QR code/voucher generation.
  - "Book for Family Member / Elder" flow with companion contact details, special assistance requests, and WhatsApp shareable summary.
  - Booking history persistence in `localStorage`.

- [ ] **Phase 7: Hotel Owner Dashboard**
  - Portal for local homestay/hotel hosts.
  - Occupancy tracker, off-season demand alerts, and dynamic discount promoter.
  - Simple listing management mock data generator.

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
