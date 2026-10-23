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

- [x] **Phase 12: Real AI integration (Gemini LLM Planner & Fallback)**
  - **Serverless LLM Endpoints**: Created `/netlify/functions/plan.js` and Vercel-compatible `/api/plan.js` proxying requests to Google Gemini API (`gemini-2.5-flash`) using environment variables `LLM_API_KEY` and `LLM_MODEL`. Never exposes API keys to client browsers. Added `.env.example` and protected secrets in `.gitignore`.
  - **Candidate-Only Activity Constraints**: Prompt constrains the model to pick activities strictly from `data/destinations.json` candidate IDs. Rejects unknown/hallucinated IDs with automatic catalog fallbacks.
  - **Zero Price Hallucination**: Model never sets prices; all activity costs (`cost * travellers`), stay rates (`stayCostPerNight * roomsNeeded * nights`), food, and transport are calculated deterministically in server and client code.
  - **Pacing & Accessibility Limits**: Enforces max 3 activities per day for general itineraries and max 1-2 activities per day for senior/accessible travelers with flat terrain.
  - **Client LLM Provider (`js/llmProvider.js`)**: Implements `planProvider` interface with 15s timeout, 1 automatic retry, and seamless fallback to deterministic rule-based generator when offline or unconfigured.
  - **Honest Dynamic Badging**: Accurately toggles between `<span class="badge badge-verified">✨ AI-Generated (Gemini)</span>` and `<span class="badge badge-demo">Simulated AI (offline fallback)</span>`.
  - **"Ask YatraLocal" Conversational Assistant**: Interactive chat card on `#/itinerary` allowing natural-language refinements ("Make day 2 more relaxed", "Swap temples for food", "Focus on nature"). Enforces a 600-token output cap, client/server HTML stripping, and in-memory IP rate limiting (10 req/min).
  - **Safety & Disclaimers**: Strips HTML tags, caps input at 200 chars, and displays mandatory advisory: *"AI suggestions — verify before travelling. All candidate places and prices are cross-checked with verified local records."*
  - **Bilingual & Saral Support**: Supports both English and Hindi (`hi-IN`), with concise reassuring sentences in Saral Mode.
  - **Automated Test Coverage**: 6/6 assertions passing in `tests/llm-provider.test.js` and 5/5 assertions passing in `tests/llm.test.html`. Visual test results captured in `assets/screenshots/llm_test_results.png` and `assets/screenshots/llm_itinerary_chat.png`.

- [x] **Phase 13: Real SOS alert delivery & live family tracking**
  - **Serverless SOS Function (`netlify/functions/sos.js` & `api/sos.js`)**: Real alert delivery via Twilio REST API to saved emergency contacts (using `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`). Generates short-lived 6-hour cryptographic tracking tokens (`crypto.randomBytes(12)`).
  - **Read-Only Family Tracking Page (`/track.html?id=TOKEN`)**: Dedicated public tracking beacon displaying the traveller's latest GPS coordinates, Leaflet map with pulsing red marker, last updated time, medical alerts, and "Traveller marked safe" banner. Strictly **zero exposed phone numbers**; data automatically expires and is purged after 6 hours.
  - **Client Tracking & Throttling (`js/sos.js`)**: Real-time `watchPosition` updates posted every 15s to the serverless tracking endpoint. Implements an offline queue (`offlineQueue`) that automatically flushes upon network reconnection (`window.addEventListener('online')`). Stops tracking and transitions status to `SAFE` upon clicking "I'm safe — stop sharing".
  - **Zero-Backend Client Fallback**: Operates fully on phones without any server keys: opens prefilled `sms:` and `https://wa.me/` direct messaging links, and invokes `navigator.share` system sheet with live tracking links.
  - **Consent, Safety Drills & Test Mode**: Retains 2-second press-and-hold trigger with 5-second cancel countdown. Enforces explicit location sharing consent checkbox stored in `localStorage`. Features a dedicated **"Send test alert to myself (TEST)"** button for safety verification.
  - **Emergency Hotlines & Metrics**: Direct 1-touch dialers for 112 (National), 100 (Police), 108 (Ambulance), and 1363 (Tourist Helpline). Logs dispatch and resolution events with timestamps to compute mean response time metrics.
  - **Privacy & Safety Disclaimer**: Prominently displays: *"This prototype is not a replacement for emergency services; production use requires testing, safeguards and compliance. In immediate danger, call 112."*
  - **Automated Verification**: 7/7 test assertions passing in `tests/sos-live.test.js` and 5/5 in `tests/sos.test.html`. Visual test artifacts captured in `assets/screenshots/sos_track_page.png` and `assets/screenshots/sos_setup_phase13.png`.

- [x] **Phase 14: Final verification against Tech Stack and Flow slide**
  - **Frontend Verification**: Pure Semantic HTML5, CSS custom properties, and Vanilla JavaScript (ES Modules). Zero build step. Responsive across 360px, 414px, 768px, 1024px, and 1440px. Lighthouse / axe accessibility score: **100/100** verified via `tests/a11y_dom_audit.html` and `tests/a11y.test.html`.
  - **Application Logic**: Verified end-to-end user flow: Landing (`#/`) ➔ Preferences Form (`#/plan`) ➔ Itinerary Engine (`#/itinerary`) with Leaflet route map & "Ask YatraLocal" chat ➔ Verified Local Stays & Guides (`#/stays`) with Haversine distance ➔ 5-Step Checkout (`#/booking`) with Family-Assisted booking ➔ Confirmation & My Trips (`#/trips`) ➔ Safety SOS (`#/sos`, `/track.html?id=TOKEN`).
  - **Data / Services Integration**:
    - **Destinations & Hosts**: 6 destinations, 48 activities with real GPS coordinates in `data/destinations.json`; 20 verified hosts in `data/hosts.json`.
    - **Interactive Map**: Pinned Leaflet 1.9.4 with SHA-384 SRI hashes + OpenStreetMap tiles, day-colored routes, crowd layers, and keyless directions deep links.
    - **Real AI**: Serverless endpoint (`netlify/functions/plan.js`, `api/plan.js`) connected to Google Gemini API (`gemini-2.5-flash`) with candidate-only constraints, zero price hallucination, and automatic fallback.
    - **Real SOS**: Serverless Twilio SMS delivery (`netlify/functions/sos.js`, `api/sos.js`) + 6-hour family live tracking page (`track.html?id=TOKEN`) + zero-backend native fallback (`sms:`, `wa.me`, `navigator.share`).
  - **Security & Key Audit**: Audited repository and client bundles — confirmed **0 real API keys** committed or leaked into client bundles. Environment secrets isolated in `.env` (protected by `.gitignore`).
  - **Documentation & Demo Script**: Updated `README.md` with finalized tech stack decisions (resolving "backend and AI provider not specified") and comparison tables. Updated `docs/DEMO_SCRIPT.md` with 3-minute pitch covering maps, real AI, live family tracking, and updated judge Q&As.

- [x] **Phase 15: User Feedback & Reviews**
  - **Seed Sample Reviews (`data/reviews.json`)**: 25 realistic sample reviews across stays, guides, and destinations in both English and Hindi. Every seed review is transparently marked with `"isSample": true` and displays a visible `[Sample review]` badge.
  - **Reviews Engine (`js/reviews.js`)**: Pure Vanilla JS reviews manager supporting `localStorage` (`yl_reviews`) persistence merged with seed reviews.
  - **Strict Security & XSS Sanitization**: All comments and user names are strictly stripped of HTML tags/control characters via `sanitizeReviewText` and rendered using DOM `textContent` (zero `innerHTML` injection). Privacy-protected first name extraction via `sanitizeFirstName` prevents accidental surname/PII leaks.
  - **Rate Limiting**: Enforces strict client rate limiting (`yl_reviewed_targets` in `localStorage`), preventing users from submitting more than 1 review per stay/guide/destination per browser.
  - **Review Submission Modal**: Star rating selector (1–5) with full keyboard accessibility (`:focus-visible`), comment textarea (10–300 chars) with live character counter, tag selection chips (Clean, Friendly host, Good value, Safe, Senior-friendly, Less crowded), and first name input. Accessible directly from listing detail modals, completed booking screen (`#/booking` step 5), and My Trips ledger (`#/trips`).
  - **Listing Detail & Filter/Sort Controls**: Displays average rating, total verified review count, 5-bar rating distribution breakdown, computed "Traveller highlights" sentiment line, and filter pills (All, 5★, 4★+, Senior-friendly, Hindi) + sorting (Newest, Highest, Lowest).
  - **Host Dashboard Integration (`#/owner`)**: Dedicated "Guest Feedback & Reputation" panel under Uncle Ramesh's dashboard (`stay-manali-1`), showing host overall rating (4.9★), 5-star distribution bars, community tag summary, and read-only recent reviews list (strictly read-only; no host editing/deleting).
  - **Accessible Saral Mode (`#/saral`)**: Large 24px+ star rating, "X travellers rated this stay", "🔊 Read Rating Aloud" speech button via `speechAssistant`, and 3-button simplified feedback (Good [5★] / Okay [3★] / Not Good [1★]) with voice confirmation.
  - **Bilingual Support**: Comprehensive English & Hindi review dictionaries in `data/i18n.json`.
  - **Automated Test Coverage**: 11/11 assertions passing in `tests/reviews.test.js` and 7/7 interactive DOM tests in `tests/reviews.test.html`. Visual test artifacts captured in `assets/screenshots/reviews_test_results.png`, `assets/screenshots/reviews_owner_dashboard.png`, `assets/screenshots/reviews_saral_mode.png`, and `assets/screenshots/reviews_mobile_360.png`.

- [x] **Phase 16: Seasonal Demand Insights & Live Weather (Off-Season vs On-Season)**
  - **Honest Seasonal Dataset (`data/seasons.json`)**: 12 months defined across all 6 destinations (`manali`, `varanasi`, `jaipur`, `rishikesh`, `hampi`, `munnar`) with demand levels (`low`, `medium`, `high`), contextual weather/climate reasons, and curated alternative destination suggestions. Strictly tagged with `"isEstimate": true` and visible disclaimer: *"Seasonality is an estimate based on general travel patterns, not live booking data."* Zero fabricated visitor headcounts or fake statistics.
  - **Live Weather API Integration (`js/api.js`)**: Open-Meteo Free Forecast API (no API key required) integration for near-term on-season travel. Features 5-second `AbortController` timeout, 1 automatic retry, 15-minute `sessionStorage` caching (`yl_weather_cache_{lat}_{lng}`), WMO code mapping to conditions, emojis, and safety alerts (rain, snowfall, fog, thunderstorm). Never called for off-season or far-future dates.
  - **Graceful Offline Fallback**: In the event of network failure or missing coordinates, client returns `{ success: false, fallback: true, message: 'Live weather not available right now' }` alongside the static seasonal description — zero UI crashes. Transparent attribution: *"Weather data: Open-Meteo"*.
  - **Seasonal Engine (`js/season.js`)**: Pure Vanilla JS engine calculating `getSeason(destinationId, month)` with helper renderers:
    - `renderSeasonBadgeHTML()`: High-visibility semantic badges (`🔴 On-season: high demand`, `🟢 Off-season: fewer crowds`, `🟡 Shoulder season: moderate crowds`).
    - `renderDemandBarHTML()`: Accessible 12-month interactive bar chart with high/medium/low CSS fill heights, `:focus-visible` states, and ARIA labels.
    - `renderAlternativesHTML()`: Displays 2-3 serene, less-crowded alternative destination cards to redistribute peak tourist pressure.
    - `renderWeatherWidgetHTML()`: 7-day weather strip with temperature ranges, conditions, and active safety notices.
  - **Trip Planner & Itinerary Views**:
    - **Preferences Form (`#/plan`)**: Added Travel Month dropdown (January–December) with dynamic live season badge preview. Saves selected month to `store.getState().preferences`.
    - **Itinerary Timeline (`#/itinerary`)**: Interactive month selector, 12-month demand bar, off-season host discount cards, and on-season Open-Meteo forecast + advisories + offbeat alternatives.
    - **Stays Listing (`#/stays`)**: Displays off-season discount badges and banner on verified local homestays when viewing off-season months.
  - **Host Dashboard Outlook (`#/owner`)**: Added "Season Demand Outlook" panel displaying demand levels for current month and next 3 months, with strategic revenue opportunity tips and "🏷️ Publish 15% Off-Season Offer" CTA for off-peak periods.
  - **Saral Mode Guidance (`#/saral`)**: 1-sentence plain-language seasonal advice (*"This is a busy season. Book early."* / *"This is a quiet season. Good time to visit."*) with read-aloud button via `speechAssistant.speak()` in English and Hindi (`hi-IN`).
  - **Bilingual Support**: Full English and Hindi translations added to `data/i18n.json` for seasonality labels, demand levels, and advice.
  - **Automated Test Coverage**: 11/11 assertions passing in `tests/season.test.js` and 10/10 interactive DOM tests in `tests/season.test.html`. Visual test artifacts captured in `assets/screenshots/season_test_results.png`, `assets/screenshots/season_demand_bar_1280.png`, `assets/screenshots/season_weather_onseason.png`, `assets/screenshots/season_owner_outlook.png`, and `assets/screenshots/season_saral_360.png`.

- [x] **Phase 17: India-Wide Place Search + Supabase (Login & Shared Reviews)**
  - **India-Wide Place Search (`js/places.js`)**:
    - **Photon API Typeahead**: Fast autocomplete geocoding querying `photon.komoot.io` bounded by India's geographic extent (`[68.1, 6.7, 97.4, 35.7]`) with country filtering (`country === 'India'`).
    - **Nominatim Fair-Use Fallback**: Nominatim fallback adhering to the OpenStreetMap 1 request/second usage policy with mandatory `© OpenStreetMap contributors` attribution.
    - **Performance & Guardrails**: 400ms debounce, minimum 3 characters, `AbortController` cancellation for in-flight requests, 5-second timeout, and 30-minute `sessionStorage` caching.
    - **Place Object Standardization**: Standardized shape `{ placeKey: "osm:<type>:<id>", name, state, district, lat, lng, source: "osm", category }`. Curated destinations retain `source: "curated"`.
  - **Open Data Enrichment**:
    - **Wikipedia Extracts API**: Fetches plain-text cultural, religious, and geographic overviews via MediaWiki REST API (stripped of all HTML tags) with source links.
    - **Overpass API Nearby Query**: Radius 10 km live Overpass interpreter query identifying authentic heritage landmarks, viewpoints, local museums, and waterfalls (limit 15, 6-second timeout, cached).
    - **Open-Meteo Weather**: Integrated 7-day live weather forecasts for any searched place coordinates.
  - **Honesty & Transparency Disclaimers**:
    - Clearly marked non-curated destinations with `<span class="badge badge-demo">🌐 Community / OpenStreetMap Data</span>` and notice: *"Community Open Data: Sourced live from OpenStreetMap. Details may be incomplete. We do not invent mock hosts, commercial prices, or unverified claims."*
  - **Dedicated Place Detail Route (`#/place/:placeKey`)**:
    - Interactive Leaflet map with place pin and secondary Overpass attraction markers.
    - Wikipedia overview, Open-Meteo 7-day weather strip, and 10km attractions grid with directions deep links (Google Maps / OpenStreetMap).
    - "Plan a Trip Here" CTA seeding state store preferences and routing to `#/plan` or `#/itinerary`.
  - **Supabase Authentication & Database Integration (`js/supabase.js`, `js/auth.js`, `sql/supabase_schema.sql`)**:
    - Pinned `@supabase/supabase-js@2.48.1` client loaded via ESM CDN. Uses only the public anon key (`SUPABASE_ANON_KEY`) in `js/config.js`; security is enforced at the database layer via PostgreSQL Row Level Security (RLS).
    - Table `public.reviews` with foreign key to `auth.users(id) ON DELETE CASCADE`, UUID primary keys, and unique constraint `(user_id, place_key, target_type)` preventing duplicate reviews.
    - Row Level Security (RLS) policies: public `SELECT` for all visitors; authenticated-only `INSERT` (`auth.uid() = user_id`); author-only `UPDATE` and `DELETE`.
    - Performance indexes on `place_key`, `target_type`, `created_at`, and `user_id`.
    - View `public.place_rating_summary` for fast aggregate star averages and rating breakdowns.
    - Tabbed accessible auth modal (Email/Password Login & Sign Up) with focus trapping, ESC support, and English/Hindi error translations.
    - Header account status badge: dynamic `[👤 Name | Log Out]` or `[🔑 Log In]`.
  - **Shared Community Reviews (`js/reviews.js`)**:
    - Migrated from local device storage to Supabase PostgreSQL backend.
    - Unauthenticated users can read all reviews; writing requires logging in.
    - Authors can delete their own reviews with live UI updates.
    - Author `<span class="badge badge-verified">✓ Verified account</span>` badge indicating authenticated user (no false stay claims).
    - Resilient offline fallback: when Supabase is offline or unconfigured, app falls back to `localStorage` and bundled seed sample reviews (`[Sample review]`) without crashing.
  - **Saral Mode & Planner Integration**:
    - Added high-contrast India place search box in Saral Mode step 1 with audio readout.
    - Accessible big-button Saral Login modal.
    - Home page Hero search bar with typeahead dropdown.
    - Planner form India-wide search input with selected place badge.
    - LLM Planner accepts Overpass attractions as candidate pool for non-curated places, preventing hallucinations.
  - **Automated Test Coverage**:
    - `tests/places.test.js`: 8/8 assertions passing (Photon/Nominatim typeahead, Place object structure, Wikipedia text extracts, Overpass query, caching, invalid coordinate fallbacks).
    - `tests/supabase.test.js`: 10/10 assertions passing (Supabase initialization, unauth write blocking, signup/login session, review publishing, duplicate review constraint, XSS sanitization, first name privacy, author deletion).
    - Interactive DOM test suite in `tests/places.test.html`.
    - Visual artifacts captured in `assets/screenshots/places_search_autocomplete.png`, `assets/screenshots/places_detail_page_1280.png`, `assets/screenshots/supabase_auth_modal.png`, and `assets/screenshots/places_test_results.png`.
