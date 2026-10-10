/**
 * YatraLocal - Landing Page View (#/)
 * Full implementation of Hero, Problems, Illustrative Scenario, Solutions,
 * Inclusion Strip, Impact Metrics, and Footer placeholders.
 */

export function renderLandingView() {
  const container = document.createElement('div');
  container.className = 'landing-view';

  container.innerHTML = `
    <!-- Hero Section -->
    <section class="hero-section" style="background: linear-gradient(180deg, #F0EAE1 0%, var(--color-bg) 100%); padding: var(--space-12) 0 var(--space-8); border-bottom: 1px solid var(--color-border);">
      <div class="container" style="text-align: center; max-width: 860px;">
        <span class="badge badge-local" style="font-size: var(--font-size-sm); padding: var(--space-2) var(--space-4); margin-bottom: var(--space-4);">
          ✨ Tourism for Everyone, Powered by Locals
        </span>
        <h1 style="font-size: clamp(2rem, 5vw, 3.25rem); color: var(--color-primary); line-height: 1.15; margin-bottom: var(--space-4);">
          Explore India’s Hidden Charms Without the Crowds
        </h1>
        <p style="font-size: clamp(1.1rem, 2.5vw, 1.35rem); color: var(--color-text-muted); font-weight: 500; margin-bottom: var(--space-6);">
          AI-powered • Local-first • Inclusive travel
        </p>
        <p style="font-size: var(--font-size-base); color: var(--color-text-main); max-width: 680px; margin: 0 auto var(--space-8);">
          Connect directly with small homestays, boutique stays, and verified local guides while steering clear of overwhelming tourist choke points. Designed for elders, pilgrims, and families alike.
        </p>
        <div class="flex-center gap-4" style="flex-wrap: wrap;">
          <a href="#/plan" class="btn btn-primary" style="font-size: var(--font-size-md); padding: var(--space-3) var(--space-8);">
            Plan my trip ➔
          </a>
          <a href="#/saral" class="btn btn-secondary" style="font-size: var(--font-size-md); padding: var(--space-3) var(--space-8);">
            ☀️ Try Saral Mode
          </a>
        </div>
      </div>
    </section>

    <!-- Problems We Solve Section -->
    <section class="container" style="padding: var(--space-12) var(--space-4);">
      <div style="text-align: center; max-width: 700px; margin: 0 auto var(--space-8);">
        <span class="badge badge-danger">The Friction in Indian Tourism</span>
        <h2 style="margin-top: var(--space-2);">Why Current Travel Apps Fall Short</h2>
        <p style="color: var(--color-text-muted);">Mass aggregators push millions to the same five overcrowded spots while authentic local hosts remain invisible.</p>
      </div>

      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-6); margin-bottom: var(--space-8);">
        <!-- Card 1 -->
        <div class="card flow">
          <div style="font-size: 2rem;">🏡</div>
          <h3>Local businesses hard to discover</h3>
          <p style="color: var(--color-text-muted);">
            Small family homestays and community guides lack marketing budgets. High OTA commissions and algorithms push them down search results, especially in off-season months.
          </p>
        </div>

        <!-- Card 2 -->
        <div class="card flow">
          <div style="font-size: 2rem;">🚦</div>
          <h3>Crowded destinations & tourist fatigue</h3>
          <p style="color: var(--color-text-muted);">
            Travellers end up in 3-hour traffic jams and packed corridors. They want peaceful, authentic experiences but lack trustworthy real-time alternatives.
          </p>
        </div>

        <!-- Card 3 -->
        <div class="card flow">
          <div style="font-size: 2rem;">📱</div>
          <h3>Digital barriers for seniors & pilgrims</h3>
          <p style="color: var(--color-text-muted);">
            Complex checkout funnels, tiny fonts, and confusing popups alienate senior citizens, pilgrims, and less tech-savvy users who need clarity, trust, and voice guidance.
          </p>
        </div>
      </div>

      <!-- Illustrative Scenario Callout -->
      <div class="card" style="border: 2px solid var(--color-accent); background: linear-gradient(135deg, #FFFDFB 0%, var(--color-accent-light) 100%);">
        <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3);">
          <span class="badge badge-local" style="font-weight: 700;">Illustrative Scenario</span>
          <span class="badge badge-demo">Real Field Problem</span>
        </div>
        <h3 style="color: var(--color-accent-hover); margin-bottom: var(--space-2);">The Tale of Two Manalis</h3>
        <p style="color: var(--color-text-main); font-size: var(--font-size-base); margin-bottom: 0;">
          On a peak Saturday afternoon in Manali, vehicles stand bumper-to-bumper for miles along Mall Road, while a serene heritage apple-orchard homestay in nearby Burwa village sits with <strong>6 of its 8 cozy rooms empty</strong>. YatraLocal balances this divide by directing mindful travellers to under-booked local gems.
        </p>
      </div>
    </section>

    <!-- Solution Features Section -->
    <section style="background-color: var(--color-bg-surface); padding: var(--space-12) 0; border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border);">
      <div class="container">
        <div style="text-align: center; max-width: 720px; margin: 0 auto var(--space-10);">
          <span class="badge badge-verified">Our Four Pillars</span>
          <h2 style="margin-top: var(--space-2);">Built for Inclusive, Local-First Discovery</h2>
          <p style="color: var(--color-text-muted);">Technology crafted to empower authentic Indian hospitality.</p>
        </div>

        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--space-6);">
          <!-- Feature 1 -->
          <div class="card card-interactive flow" style="border-top: 4px solid var(--color-primary);">
            <div style="font-size: 2rem;">🧭</div>
            <h3 style="font-size: var(--font-size-lg);">AI Trip Planner</h3>
            <p style="color: var(--color-text-muted);">
              Generates realistic, day-wise itineraries matching your budget, pacing, and mood while routing you around congestion.
            </p>
            <a href="#/plan" class="btn btn-ghost btn-sm" style="align-self: flex-start;">Start Planning ➔</a>
          </div>

          <!-- Feature 2 -->
          <div class="card card-interactive flow" style="border-top: 4px solid var(--color-accent);">
            <div style="font-size: 2rem;">🪪</div>
            <h3 style="font-size: var(--font-size-lg);">Local Stays & Guides</h3>
            <p style="color: var(--color-text-muted);">
              Browse hand-verified homestays, village farmstays, and licensed regional guides with transparent local rates and seasonal offers.
            </p>
            <a href="#/stays" class="btn btn-ghost btn-sm" style="align-self: flex-start;">Browse Stays ➔</a>
          </div>

          <!-- Feature 3 -->
          <div class="card card-interactive flow" style="border-top: 4px solid var(--color-success);">
            <div style="font-size: 2rem;">📊</div>
            <h3 style="font-size: var(--font-size-lg);">Hotel Owner Dashboard</h3>
            <p style="color: var(--color-text-muted);">
              Small property owners gain demand forecasting, off-season flash offer creation, and direct booking visibility without punitive fees.
            </p>
            <a href="#/owner" class="btn btn-ghost btn-sm" style="align-self: flex-start;">View Host Hub ➔</a>
          </div>

          <!-- Feature 4 -->
          <div class="card card-interactive flow" style="border-top: 4px solid var(--color-danger);">
            <div style="font-size: 2rem;">🚨</div>
            <h3 style="font-size: var(--font-size-lg);">Safety SOS Beacon</h3>
            <p style="color: var(--color-text-muted);">
              One-click live GPS coordinate sharing via WhatsApp and quick access to Tourist Police (1363) and Women Helpline (1091).
            </p>
            <button type="button" class="btn btn-ghost btn-sm" onclick="window.YatraApp.showToast('🚨 SOS Safety beacon is always accessible via the floating button at bottom right!')">
              Test Beacon ➔
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Inclusion Strip -->
    <section class="container" style="padding: var(--space-10) var(--space-4);">
      <div class="card" style="background-color: #FEF3C7; border: 1.5px solid #F59E0B; padding: var(--space-8);">
        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); align-items: center; gap: var(--space-6);">
          <div class="flow">
            <span class="badge" style="background-color: #FDE68A; color: #92400E; border: 1px solid #D97706;">Designed for Everyone</span>
            <h2 style="color: #78350F; margin: 0;">Saral Mode & Family-Assisted Travel</h2>
            <p style="color: #92400E; margin-bottom: 0;">
              High-contrast big buttons, Marathi/Hindi/English voice narration, and a companion booking mode allowing sons and daughters to book for their parents traveling for Teerth Yatra.
            </p>
          </div>
          <div class="flex gap-3" style="flex-direction: column;">
            <div style="background-color: #FFFFFF; padding: var(--space-4); border-radius: var(--radius-md); border: 1px solid #FCD34D;">
              <strong>👨‍🦳 For Seniors & Pilgrims:</strong> Large readable text, low-stress itineraries, minimal walking routes.
            </div>
            <div style="background-color: #FFFFFF; padding: var(--space-4); border-radius: var(--radius-md); border: 1px solid #FCD34D;">
              <strong>👨‍👩‍👧 For Families:</strong> Assist parents with bookings, get emergency updates, and coordinate with verified guides.
            </div>
            <a href="#/saral" class="btn btn-secondary" style="align-self: flex-start;">Open Saral Mode ➔</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Impact Strip -->
    <section style="background-color: var(--color-bg-surface); padding: var(--space-10) 0; border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border);">
      <div class="container">
        <div style="text-align: center; margin-bottom: var(--space-8);">
          <span class="badge badge-verified">Metrics & Accountability</span>
          <h2 style="margin-top: var(--space-2);">What We Track</h2>
          <p style="color: var(--color-text-muted);">Real goals measured across pilot communities.</p>
        </div>

        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-6);">
          <div class="card flow" style="text-align: center;">
            <div style="font-size: 1.75rem; font-weight: 700; color: var(--color-primary);">Local Bookings</div>
            <p style="color: var(--color-text-muted); font-size: var(--font-size-sm);">Direct revenue routed to small family homestays & guides</p>
            <div>
              <span class="stat-placeholder">[Add verified statistic + source]</span>
            </div>
          </div>

          <div class="card flow" style="text-align: center;">
            <div style="font-size: 1.75rem; font-weight: 700; color: var(--color-accent);">Off-Season Boost</div>
            <p style="color: var(--color-text-muted); font-size: var(--font-size-sm);">Occupancy uplift through dynamic off-peak promos</p>
            <div>
              <span class="stat-placeholder">[Add verified statistic + source]</span>
            </div>
          </div>

          <div class="card flow" style="text-align: center;">
            <div style="font-size: 1.75rem; font-weight: 700; color: var(--color-success);">Saral Completion</div>
            <p style="color: var(--color-text-muted); font-size: var(--font-size-sm);">Successful simplified bookings completed by elders</p>
            <div style="font-weight: 600; color: var(--color-success);">Target: &gt; 92% completion</div>
          </div>

          <div class="card flow" style="text-align: center;">
            <div style="font-size: 1.75rem; font-weight: 700; color: var(--color-danger);">SOS Response</div>
            <p style="color: var(--color-text-muted); font-size: var(--font-size-sm);">Emergency coordinate dispatch latency</p>
            <div style="font-weight: 600; color: var(--color-danger);">&lt; 15 seconds</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Hackathon Footer Information Strip -->
    <section class="container" style="padding: var(--space-8) var(--space-4);">
      <div class="card flow" style="background-color: var(--color-bg-subtle); border-style: dashed;">
        <h3>Hackathon Submission Placeholders</h3>
        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-4); font-size: var(--font-size-sm);">
          <div>
            <strong>🌐 Live Demo URL:</strong>
            <p style="margin: 0; color: var(--color-text-muted);"><span class="badge badge-demo">https://yatralocal.netlify.app</span> (Deployment in Phase 10)</p>
          </div>
          <div>
            <strong>💻 GitHub Repository:</strong>
            <p style="margin: 0; color: var(--color-text-muted);"><span class="badge badge-demo">https://github.com/yatralocal/yatra-local-app</span></p>
          </div>
          <div>
            <strong>✉️ Contact / Inquiries:</strong>
            <p style="margin: 0; color: var(--color-text-muted);"><a href="mailto:team@yatralocal.org">team@yatralocal.org</a></p>
          </div>
        </div>
      </div>
    </section>
  `;

  return container;
}
