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

- [x] **Phase 8: Safety SOS**
  - Global floating button `#global-sos-btn` with 2-second press-and-hold circular SVG progress ring and accidental trigger confirmation modal.
  - Extra-large 68px touch target with high contrast in Saral Mode.
  - 5-second countdown cancel overlay with sound cues and Web Speech audio alert ("SOS activated" in English and Hindi).
  - Safety SOS Hub (`#/sos`) with contact manager (up to 3 emergency contacts), medical conditions editor, and live GPS sharing toggle.
  - Live geolocation beacon tracking via `navigator.geolocation.watchPosition` with battery-friendly throttling and safe fallback to Burwa, Manali coordinates.
  - One-touch emergency dispatch triggers: prefilled WhatsApp location message, SMS format, and Google Maps deep links.
  - Official National Emergency Directory with direct `tel:` hotlines: 112 (All India), 100 (Police), 108 (Ambulance), 1091 (Women Helpline), 1363 (Tourist Helpline).
  - Incident event logger storing simulated dispatch and resolution timestamps in `localStorage` for impact metrics.
  - 100% on-device privacy guarantee and simulated alert disclaimer.
  - 5/5 automated unit tests passing in `tests/sos.test.html`.

- [x] **Phase 9: Accessibility, polish & QA**
  - **Lighthouse / axe-style A11y Audit**: **100/100 Accessibility score** achieved across all 6 semantic checkpoints (landmarks, heading order, alt attributes, skip-to-content links, ARIA labels, tap targets).
  - **Keyboard-Only Walkthrough**: Tested full user flow without mouse; tab rings clearly visible (`:focus-visible` with 3px outline); programmatic focus shift to `<h1>` on every route change.
  - **Responsive Layout Audits**: Verified seamless rendering with zero overflow across 360px, 414px, 768px, 1024px, and 1440px viewports (captured screenshots).
  - **Motion & Accessibility**: Fully honors `prefers-reduced-motion: reduce` by disabling non-essential transitions and pulsing rings.
  - **Bilingual Layer (EN / हिंदी)**: Loaded `/data/i18n.json` dictionary into `js/i18n.js` with reactive DOM translation across navigation, Saral Mode, and SOS screens.
  - **Custom 404 Route (`#/404`)**: Added trail recovery page with clear navigational links back to Home, Plan Trip, and SOS.
  - **Consistency & Disclaimers**: Verified all simulated modules carry `[Demo / Simulated]` or `[Concept / Business Model]`; preserved `[Add verified statistic + source]` placeholders; confirmed sample data disclaimer in footer.
  - **Automated Tests**: 5/5 automated unit tests passing in `tests/a11y.test.html` and 100% pass in `tests/a11y_dom_audit.html`.

- [x] **Phase 10: Deploy, README & demo script**
  - Authored comprehensive `README.md` with problem statement ("Tale of Two Manalis"), solution architecture, high-res screenshots, simulated vs. real feature matrix, known limitations, future roadmap, and fair tourism revenue model.
  - Added "Impact Measurement" section mapping local bookings, off-season occupancy, Saral completion, and SOS response time tracking to prototype mechanisms.
  - Added clear placeholder markers for Live Demo URL, GitHub URL, team contact email, and `[Add verified tourism statistics + source URLs]`.
  - Added static hosting configuration (`_redirects` for Netlify/GitHub Pages) and metadata tags in `index.html` (Open Graph, Twitter Card, theme-color `#0D5C5B`, and SVG favicon).
  - Authored `/docs/DEMO_SCRIPT.md`: 3-minute timed pitch script (0:00 Problem → 0:30 Solution → 1:00 Live Plan & Stays → 1:45 Saral Mode → 2:15 Owner Hub → 2:35 SOS → 2:50 Impact/Ask) with 8 judge Q&As and demo-day checklist.
  - Prepared publication git commands.

- [x] **Phase 11: Real interactive map integration**
  - **Leaflet & OpenStreetMap**: Integrated Leaflet 1.9.4 from unpkg CDN pinned with verified SHA-384 Subresource Integrity (SRI) hashes in `index.html` (CSS: `sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H`, JS: `sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH`), requiring zero external API keys.
  - **Geographic Data Coverage**: Populated real, verified GPS lat/lng coordinates for all 48 activities across 6 destinations (Manali, Jaipur, Varanasi, Rishikesh, Hampi, Munnar) in `data/destinations.json`, and all 20 hosts (12 homestays + 8 guides) in `data/hosts.json`.
  - **Itinerary Map (`#/itinerary`)**: Interactive map with day-colored markers (`DAY_PALETTE`), numbered stops (`day.stop`), polyline paths connecting day stops, custom popups (activity title, time, cost, crowd badge, and keyless directions deep link), day filter buttons ("All Days", "Day 1", etc.), "Fit All" auto-bounding button, and a "Crowd-aware" layer toggle shading high-crowd hotspots red (`#C5221F`) and offbeat alternatives green (`#1E6F5C`).
  - **Stays Map (`#/stays`)**: Seamless List / Map view toggle, custom icon markers for verified homestays (🏡) and certified guides (🎓), click-to-detail modal interaction, and dynamic Haversine distance calculator displaying "📏 X.X km from Day 1 start" on both stay cards and map popups.
  - **Keyless External Directions**: One-touch deep links to Google Maps (`https://www.google.com/maps/dir/?api=1&destination=lat,lng`) and OpenStreetMap (`https://www.openstreetmap.org/directions?route=;lat,lng`) with zero API key dependencies.
  - **Saral Mode Map**: Accessible, high-contrast map with large 44px markers and a prominent "Show on map" big toggle button.
  - **Resilience & Attribution**: Prominent OpenStreetMap attribution bar (`© OpenStreetMap contributors`); graceful offline fallback list rendering distances and direct coordinates if CDN or tiles fail.
  - **Automated Verification**: 6/6 test assertions passing in `tests/map-node-verify.js` and `tests/map.test.html`. Captured visual verification screenshots across desktop (1280px) and mobile (360px).

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
