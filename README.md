# YatraLocal — Tourism for Everyone, Powered by Locals

> **24-hour Hackathon Prototype**  
> An AI-powered, local-first, inclusive travel web app for India that connects travellers with small hotels, homestays, and verified local guides, steers people away from overcrowded spots, and works seamlessly for seniors, pilgrims, and less tech-savvy users.

---

## 🚩 Problems We Solve
1. **Hidden Local Gems & Off-season Vacancy**: Small hotels, homestays, and local guides struggle with discovery and low occupancy during off-peak periods (e.g., a Manali homestay with 6 of 8 empty rooms while popular tourist spots are overcrowded).
2. **Overtourism & Lack of Personalisation**: Travellers get directed to overcrowded hotspots without trusted, high-quality local alternatives.
3. **Tech & Usability Barriers**: Complex modern travel apps alienate seniors, pilgrims, and rural travellers.

---

## 🌟 Core Features
- **AI Trip Planner**: Day-wise customized itineraries based on budget, duration, and travel mood.
- **Local Stays & Guides**: Direct discovery and contact with homestays and verified local guides.
- **Hotel Owner Dashboard**: Real-time demand insights, pricing tips, and off-season promotion triggers.
- **Safety SOS**: One-touch live location sharing and emergency contact alerts.
- **Saral Mode**: High-contrast, large-font, voice-guided, simplified booking interface designed for elders and pilgrims.
- **Family-Assisted Booking**: Seamless flow allowing family members to plan and confirm bookings on behalf of travellers.

---

## 🛠 Tech Stack & Architecture
- **Frontend**: Vanilla HTML5, CSS3, modern JavaScript (ES Modules). Zero build step, zero heavy frameworks.
- **State Management**: Client-side reactive persistence using `localStorage`.
- **Accessibility & Design**: WCAG AA compliant contrast, mobile-first responsive layout, keyboard accessible.
- **Services & Real Integrations (Phases 11-13)**: Lightweight serverless proxy endpoints (`/api`) for Map, AI, and SOS integrations with automatic offline/mock fallback.
- **Local Dev Servers**:
  - Static app: `npx serve .`
  - With serverless API functions: `npx netlify dev`

---

## 📂 Project Structure
```text
YATRALOCAL/
├── index.html           # Main entry point & app shell
├── css/                 # Design system, themes (default & Saral), and styles
├── js/                  # Modular ES logic (router, trip planner, bookings, state)
├── data/                # Sample datasets (destinations, stays, guides, offers)
├── pages/               # Page templates / views
├── assets/              # Icons, badges, images
├── api/                 # Serverless proxy endpoints (Phases 11-13)
├── README.md            # Project documentation & demo guidelines
└── PROGRESS.md          # 14-phase development checklist & QA tracking
```

---

## 🚀 Getting Started
```bash
# Serve static web app
npx serve .

# Or run with local API function proxy (Netlify Dev)
npx netlify dev
```
