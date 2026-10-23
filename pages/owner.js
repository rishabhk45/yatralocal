/**
 * YatraLocal - Hotel & Homestay Owner Dashboard (#/owner)
 * 
 * Features:
 * 1. Simulated Demo Login: Burwa Apple Woods Homestay, Manali (8 rooms, 6 empty).
 * 2. KPI Metrics: Occupancy %, upcoming bookings, estimated monthly revenue, off-season gap.
 * 3. Demand Insights: Pure SVG responsive bar & line charts (zero external libs) marked "Sample data".
 * 4. Off-Season Offer Builder: Discount %, rooms, dates, message, live preview card, and instant publishing to store.
 * 5. AI-Style Suggestions Panel: Rule-based smart pricing & senior bundle recommendations.
 * 6. Bookings Management Table: Merges sample data + Phase 6 user bookings with mobile card transformation.
 * 7. Monetization / Subscription Teaser Card: Clearly labeled "Concept".
 */

import { store } from '../js/store.js';
import { reviewsManager, createReviewCardDOM } from '../js/reviews.js';
import { loadSeasonsData, getSeason, renderSeasonBadgeHTML } from '../js/season.js';

export function renderOwnerView() {
  const container = document.createElement('div');
  container.className = 'container owner-container';
  container.style.maxWidth = '1120px';
  container.style.margin = '0 auto';
  container.style.padding = 'var(--space-6) var(--space-4) 100px var(--space-4)';

  const state = store.getState();
  const session = state.ownerSession || { loggedIn: false };
  const hostId = session.hostId || 'stay-manali-1';

  // Baseline host info
  const hostInfo = {
    id: 'stay-manali-1',
    name: 'Burwa Apple Woods Homestay',
    hostName: 'Uncle Ramesh Thakur & Sunita',
    area: 'Burwa Village (6 km from Manali)',
    roomsTotal: 8,
    roomsAvailableOffSeason: 6, // 6 of 8 empty
    roomsOccupied: 2,
    basePrice: 1400,
    originalPrice: 2150
  };

  // Merge store bookings for this host
  const userBookings = (state.bookings || []).filter((b) => {
    return b.stay?.id === hostId || b.destination?.toLowerCase().includes('manali');
  });

  // Calculate dynamic KPIs
  const totalOccupied = hostInfo.roomsOccupied + userBookings.length;
  const totalEmpty = Math.max(0, hostInfo.roomsTotal - totalOccupied);
  const occupancyRate = Math.round((totalOccupied / hostInfo.roomsTotal) * 100);
  const estMonthlyGross = totalOccupied * hostInfo.basePrice * 24; // 24 active nights/mo
  const estMonthlyNet = Math.round(estMonthlyGross * 0.90); // 90% direct host payout
  const offSeasonGapLoss = totalEmpty * hostInfo.basePrice * 20; // 20 days off-season gap

  // Active or draft offer
  const savedOffer = store.getHostOffer(hostId) || {
    discountPercent: 35,
    roomsOffered: 4,
    dates: 'Weekday Winter Special (Nov 1 – Nov 30)',
    promoMessage: 'Complimentary warm Siddu breakfast and orchard stroll included'
  };

  let offerDraft = {
    discountPercent: savedOffer.discountPercent || 35,
    roomsOffered: savedOffer.roomsOffered || 4,
    dates: savedOffer.dates || 'Weekday Winter Special (Nov 1 – Nov 30)',
    promoMessage: savedOffer.promoMessage || 'Complimentary warm Siddu breakfast and orchard stroll included'
  };

  function renderView() {
    if (!session.loggedIn) {
      // Login Gate Screen
      container.innerHTML = `
        <div class="card flow" style="max-width: 600px; margin: var(--space-12) auto; text-align: center; padding: var(--space-8); border: 2px solid var(--color-border); box-shadow: var(--shadow-md);">
          <div style="font-size: 3rem;">🏡</div>
          <span class="badge badge-verified">Direct Host Portal</span>
          <h1 style="margin: var(--space-2) 0; font-size: clamp(1.6rem, 3.5vw, 2.2rem);">Hotel & Homestay Owner Hub</h1>
          <p style="color: var(--color-text-muted); line-height: 1.6;">
            A dedicated dashboard for small family-run homestays and boutique hotel owners in India. Track demand, publish off-season discounts, and receive direct 90% guest payouts.
          </p>

          <!-- Illustrative Scenario Host Card -->
          <div style="background-color: var(--color-bg); padding: var(--space-4); border-radius: var(--radius-md); text-align: left; margin: var(--space-4) 0; border: 1.5px solid var(--color-border);">
            <div class="flex-between">
              <strong>Burwa Apple Woods Homestay</strong>
              <span class="badge badge-local">📍 Manali</span>
            </div>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 4px 0 0;">
              Hosted by Uncle Ramesh Thakur • 8 rooms total (6 empty off-season)
            </p>
          </div>

          <div>
            <button type="button" id="btn-owner-login" class="btn btn-primary btn-lg" style="width: 100%; font-size: 1.15rem; padding: 14px 24px;">
              🔐 Login as Demo Owner (Uncle Ramesh) ➔
            </button>
          </div>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: var(--space-3);">
            No password required • <em>Demo / Simulated Authentication</em>
          </p>
        </div>
      `;

      container.querySelector('#btn-owner-login')?.addEventListener('click', () => {
        store.loginAsOwner(hostInfo.id);
        renderOwnerDashboard();
      });
      return;
    }

    renderOwnerDashboard();
  }

  function renderOwnerDashboard() {
    const revMetrics = reviewsManager.getMetricsForTarget(hostInfo.id);
    const hostReviews = reviewsManager.getReviewsForTarget(hostInfo.id);

    const curMonthIdx = new Date().getMonth();
    const seasonInfo = getSeason('manali', curMonthIdx);
    const next3Months = [1, 2, 3].map(offset => {
      const mIdx = (curMonthIdx + offset) % 12;
      return getSeason('manali', mIdx);
    });
    const hasLowDemandUpcoming = next3Months.some(m => m.isOffSeason || m.isShoulder);

    container.innerHTML = `
      <!-- Top Host Profile & Session Banner -->
      <div class="card flex-between" style="flex-wrap: wrap; gap: var(--space-3); padding: var(--space-4) var(--space-6); background: linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%); border-left: 5px solid var(--color-primary); margin-bottom: var(--space-6);">
        <div class="flex gap-3" style="align-items: center;">
          <div style="font-size: 2.2rem;">🏡</div>
          <div>
            <div class="flex gap-2" style="align-items: center;">
              <h2 style="margin: 0; font-size: 1.35rem;">${hostInfo.name}</h2>
              <span class="badge badge-verified">✓ Verified Local Host</span>
            </div>
            <p style="margin: 2px 0 0; color: var(--color-text-muted); font-size: var(--font-size-xs);">
              Owner: <strong>${hostInfo.hostName}</strong> • 📍 ${hostInfo.area} • Direct Payout Account: <strong>SBI-Kullu-***492</strong>
            </p>
          </div>
        </div>

        <div class="flex gap-2">
          <a href="#/stays" class="btn btn-ghost btn-sm" target="_blank">View Live on Stays ➔</a>
          <button type="button" id="btn-owner-logout" class="btn btn-ghost btn-sm" style="color: var(--color-danger); border-color: var(--color-danger);">
            Logout
          </button>
        </div>
      </div>

      <!-- KPI Metrics Row -->
      <section style="margin-bottom: var(--space-8);">
        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: var(--space-4);">
          <!-- Metric 1: Occupancy -->
          <div class="card flow" style="padding: var(--space-5); border-top: 4px solid var(--color-primary);">
            <div class="flex-between">
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-weight: 700;">CURRENT OCCUPANCY</span>
              <span style="font-size: 1.25rem;">🛏️</span>
            </div>
            <div style="font-size: 2.2rem; font-weight: 800; color: ${occupancyRate < 35 ? 'var(--color-danger)' : 'var(--color-primary)'};">
              ${occupancyRate}%
            </div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
              <strong>${totalOccupied} of ${hostInfo.roomsTotal}</strong> rooms occupied • <span style="color: var(--color-danger); font-weight: 600;">${totalEmpty} rooms vacant</span>
            </div>
          </div>

          <!-- Metric 2: Upcoming Bookings -->
          <div class="card flow" style="padding: var(--space-5); border-top: 4px solid var(--color-accent);">
            <div class="flex-between">
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-weight: 700;">UPCOMING GUESTS</span>
              <span style="font-size: 1.25rem;">📅</span>
            </div>
            <div style="font-size: 2.2rem; font-weight: 800; color: var(--color-accent);">
              ${2 + userBookings.length} Bookings
            </div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
              ${userBookings.length > 0 ? `Includes <strong>${userBookings.length}</strong> new booking(s) from YatraLocal app` : 'Next check-in: Tomorrow at 12:00 PM'}
            </div>
          </div>

          <!-- Metric 3: Est Monthly Net Payout -->
          <div class="card flow" style="padding: var(--space-5); border-top: 4px solid var(--color-success);">
            <div class="flex-between">
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-weight: 700;">EST. MONTHLY PAYOUT</span>
              <span style="font-size: 1.25rem;">💰</span>
            </div>
            <div style="font-size: 2.2rem; font-weight: 800; color: var(--color-success);">
              ₹${estMonthlyNet.toLocaleString('en-IN')}
            </div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
              ✓ 90% direct payout retained (10% app platform fee)
            </div>
          </div>

          <!-- Metric 4: Off-Season Revenue Gap -->
          <div class="card flow" style="padding: var(--space-5); border-top: 4px solid #D97706; background-color: #FFFDF9;">
            <div class="flex-between">
              <span style="font-size: var(--font-size-xs); color: #B45309; font-weight: 700;">OFF-SEASON GAP (UNEARNED)</span>
              <span style="font-size: 1.25rem;">⚠️</span>
            </div>
            <div style="font-size: 2.2rem; font-weight: 800; color: #B45309;">
              ₹${offSeasonGapLoss.toLocaleString('en-IN')}
            </div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
              Lost revenue on <strong>${totalEmpty} empty rooms</strong> without flash discounts
            </div>
          </div>
        </div>
      </section>

      <!-- Season Outlook & Advance Demand Card (Phase 16) -->
      <section style="margin-bottom: var(--space-8);">
        <div class="card flow" style="padding: var(--space-5); border: 2px solid var(--color-border); background: #FFFFFF;">
          <div class="flex-between" style="align-items: flex-start; flex-wrap: wrap; gap: var(--space-3);">
            <div>
              <div class="flex gap-2" style="align-items: center; margin-bottom: 4px;">
                <span class="badge badge-verified">Demand Outlook</span>
                ${renderSeasonBadgeHTML(seasonInfo.demandLevel, 'EN')}
              </div>
              <h3 style="margin: 0; font-size: 1.25rem;">
                Seasonal Demand Outlook for ${seasonInfo.destinationName}
              </h3>
              <p style="color: var(--color-text-muted); font-size: var(--font-size-xs); margin: 2px 0 0;">
                Current month: <strong>${seasonInfo.monthName}</strong> (${seasonInfo.demandLevel.toUpperCase()} demand) • ${seasonInfo.reason}
              </p>
            </div>
            <span class="badge badge-demo">Estimate based on travel cycles</span>
          </div>

          <!-- 3-Month Projection Grid -->
          <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3); margin-top: var(--space-4);">
            ${next3Months.map(m => `
              <div style="background-color: var(--color-bg); padding: var(--space-3); border-radius: var(--radius-md); border-left: 4px solid ${m.demandLevel === 'low' ? '#10B981' : (m.demandLevel === 'high' ? '#EF4444' : '#F59E0B')};">
                <div class="flex-between" style="align-items: center;">
                  <strong>${m.monthName}</strong>
                  ${renderSeasonBadgeHTML(m.demandLevel, 'EN')}
                </div>
                <p style="margin: 4px 0 0; font-size: var(--font-size-xs); color: var(--color-text-muted); line-height: 1.4;">
                  ${m.reason}
                </p>
              </div>
            `).join('')}
          </div>

          <!-- Host Strategic Suggestion -->
          <div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; padding: var(--space-3) var(--space-4); border-radius: var(--radius-sm); margin-top: var(--space-4);">
            <strong style="color: #15803D;">💡 Revenue Opportunity Suggestion:</strong>
            <p style="margin: 2px 0 0; font-size: var(--font-size-xs); color: #166534; line-height: 1.5;">
              ${hasLowDemandUpcoming
                ? `Upcoming months include quiet low-demand periods. Use the <strong>Off-Season Offer Builder</strong> below to publish an advance discount and attract early travellers.`
                : `Upcoming months have strong demand. Maintain your standard rates and prioritize early confirmations.`
              }
            </p>
          </div>
        </div>
      </section>

      <!-- Demand Insights Section (Pure SVG Charts - Zero external libraries) -->
      <section style="margin-bottom: var(--space-8);">
        <div class="flex-between" style="margin-bottom: var(--space-3); flex-wrap: wrap;">
          <div>
            <h2 style="margin: 0; font-size: 1.4rem;">Manali Regional Demand Insights</h2>
            <p style="margin: 2px 0 0; color: var(--color-text-muted); font-size: var(--font-size-xs);">
              Compare seasonality curves to price empty rooms dynamically. <span class="badge badge-demo">Sample data</span>
            </p>
          </div>
          <span class="badge badge-local">Updated Live</span>
        </div>

        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-4);">
          <!-- Chart 1: Monthly Search Volume Bar Chart -->
          <div class="card flow" style="padding: var(--space-5);">
            <div class="flex-between">
              <strong style="font-size: var(--font-size-sm); color: var(--color-text-main);">Monthly Search Volume (Manali Area)</strong>
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Jan – Dec</span>
            </div>

            <svg viewBox="0 0 500 200" style="width: 100%; height: auto; overflow: visible; font-family: sans-serif;" role="img" aria-label="Monthly Search Volume Bar Chart">
              <!-- Grid lines -->
              <line x1="40" y1="20" x2="480" y2="20" stroke="#E5E7EB" stroke-dasharray="4"/>
              <line x1="40" y1="70" x2="480" y2="70" stroke="#E5E7EB" stroke-dasharray="4"/>
              <line x1="40" y1="120" x2="480" y2="120" stroke="#E5E7EB" stroke-dasharray="4"/>
              <line x1="40" y1="160" x2="480" y2="160" stroke="#9CA3AF" stroke-width="1.5"/>

              <!-- Y Axis labels -->
              <text x="32" y="24" font-size="10" fill="#6B7280" text-anchor="end">140k</text>
              <text x="32" y="74" font-size="10" fill="#6B7280" text-anchor="end">80k</text>
              <text x="32" y="124" font-size="10" fill="#6B7280" text-anchor="end">40k</text>
              <text x="32" y="164" font-size="10" fill="#6B7280" text-anchor="end">0</text>

              <!-- Monthly Bars: Jan(50), Feb(60), Mar(70), Apr(90), May(135), Jun(140), Jul(110), Aug(75), Sep(85), Oct(95), Nov(35), Dec(45) -->
              ${[
                { m: 'Jan', val: 50 }, { m: 'Feb', val: 60 }, { m: 'Mar', val: 70 },
                { m: 'Apr', val: 90 }, { m: 'May', val: 135 }, { m: 'Jun', val: 140 },
                { m: 'Jul', val: 110 }, { m: 'Aug', val: 75 }, { m: 'Sep', val: 85 },
                { m: 'Oct', val: 95 }, { m: 'Nov', val: 35, highlight: true }, { m: 'Dec', val: 45, highlight: true }
              ].map((item, idx) => {
                const x = 50 + idx * 36;
                const h = (item.val / 140) * 140;
                const y = 160 - h;
                const color = item.highlight ? '#D97706' : '#0D5C5B';
                return `
                  <rect x="${x}" y="${y}" width="24" height="${h}" rx="4" fill="${color}">
                    <title>${item.m}: ${item.val}k searches</title>
                  </rect>
                  <text x="${x + 12}" y="178" font-size="10" fill="#4B5563" text-anchor="middle">${item.m}</text>
                `;
              }).join('')}
            </svg>
            <div style="font-size: var(--font-size-xs); color: #B45309; text-align: center; margin-top: 4px;">
              ⚠️ <strong>November & December Trough (35k searches):</strong> Ideal window for flash discounts.
            </div>
          </div>

          <!-- Chart 2: Congestion vs Peaceful Hamlets Curve -->
          <div class="card flow" style="padding: var(--space-5);">
            <div class="flex-between">
              <strong style="font-size: var(--font-size-sm); color: var(--color-text-main);">Traveller Demand Shift (Town vs Hamlets)</strong>
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">2024 vs 2026 Trend</span>
            </div>

            <svg viewBox="0 0 500 200" style="width: 100%; height: auto; overflow: visible; font-family: sans-serif;" role="img" aria-label="Mall Road vs Village Hamlets Trend Line Chart">
              <!-- Grid lines -->
              <line x1="40" y1="30" x2="480" y2="30" stroke="#E5E7EB" stroke-dasharray="4"/>
              <line x1="40" y1="80" x2="480" y2="80" stroke="#E5E7EB" stroke-dasharray="4"/>
              <line x1="40" y1="130" x2="480" y2="130" stroke="#E5E7EB" stroke-dasharray="4"/>
              <line x1="40" y1="165" x2="480" y2="165" stroke="#9CA3AF" stroke-width="1.5"/>

              <!-- Axis labels -->
              <text x="32" y="34" font-size="10" fill="#6B7280" text-anchor="end">High</text>
              <text x="32" y="100" font-size="10" fill="#6B7280" text-anchor="end">Med</text>
              <text x="32" y="168" font-size="10" fill="#6B7280" text-anchor="end">Low</text>

              <!-- Town Congestion Curve (Declining satisfaction) -->
              <path d="M 60 50 Q 200 40, 300 90 T 460 140" fill="none" stroke="#DC2626" stroke-width="3"/>
              
              <!-- Offbeat Hamlet Demand Curve (Growing preference) -->
              <path d="M 60 150 Q 200 130, 320 70 T 460 40" fill="none" stroke="#059669" stroke-width="3.5"/>

              <!-- Labels on curves -->
              <text x="465" y="145" font-size="11" fill="#DC2626" font-weight="bold">Mall Road Choke</text>
              <text x="465" y="45" font-size="11" fill="#059669" font-weight="bold">Burwa / Naggar Villages ↗</text>
            </svg>

            <div class="flex gap-4" style="justify-content: center; font-size: var(--font-size-xs); margin-top: 6px;">
              <span style="color: #059669; font-weight: 700;">— Peaceful Hamlets (+42% YoY)</span>
              <span style="color: #DC2626; font-weight: 700;">— Overcrowded Town Chokepoints</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Off-Season Offer Builder & Live Card Preview -->
      <section style="margin-bottom: var(--space-8);">
        <div class="flex-between" style="margin-bottom: var(--space-3); flex-wrap: wrap;">
          <div>
            <h2 style="margin: 0; font-size: 1.4rem;">Off-Season Flash Offer Builder</h2>
            <p style="margin: 2px 0 0; color: var(--color-text-muted); font-size: var(--font-size-xs);">
              Create an exclusive promotion to fill your 6 vacant rooms. Changes preview live below.
            </p>
          </div>
          <span class="badge badge-verified">Instant Live Sync</span>
        </div>

        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-6); align-items: flex-start;">
          <!-- Controls Form -->
          <div class="card flow" style="padding: var(--space-5);">
            <div class="form-group" style="margin: 0;">
              <label class="form-label" for="inp-offer-discount">
                Discount Percentage: <strong id="val-discount" style="color: var(--color-accent);">${offerDraft.discountPercent}%</strong>
              </label>
              <input type="range" id="inp-offer-discount" min="10" max="50" step="5" value="${offerDraft.discountPercent}" style="width: 100%; cursor: pointer;" />
              <div class="flex-between" style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
                <span>10% (Subtle)</span>
                <span>35% (Recommended)</span>
                <span>50% (Max Flash)</span>
              </div>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" for="inp-offer-rooms">
                Vacant Rooms to Allocate: <strong id="val-rooms">${offerDraft.roomsOffered} Rooms</strong>
              </label>
              <input type="range" id="inp-offer-rooms" min="1" max="6" step="1" value="${offerDraft.roomsOffered}" style="width: 100%; cursor: pointer;" />
              <div class="form-hint" style="font-size: var(--font-size-xs);">Remaining 2 rooms reserved for regular walk-in guests.</div>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" for="inp-offer-dates">Promotion Dates / Season</label>
              <input type="text" id="inp-offer-dates" class="form-input" value="${offerDraft.dates}" placeholder="e.g. Midweek Special (Nov 1 – Nov 30)" />
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" for="inp-offer-msg">Special Host Bonus / Value-Add</label>
              <input type="text" id="inp-offer-msg" class="form-input" value="${offerDraft.promoMessage}" placeholder="e.g. Free Siddu breakfast and apple orchard stroll" />
            </div>

            <div style="padding-top: var(--space-2);">
              <button type="button" id="btn-publish-offer" class="btn btn-primary" style="width: 100%; font-size: 1.15rem; background-color: var(--color-accent); border-color: var(--color-accent-hover);">
                🚀 Publish Offer Live to YatraLocal ➔
              </button>
            </div>
          </div>

          <!-- Live Card Preview exactly as travellers see it -->
          <div>
            <div style="font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-muted); margin-bottom: var(--space-2); text-transform: uppercase;">
              👁️ Live Traveller View Preview:
            </div>
            <div id="offer-live-preview-box">
              ${renderPreviewCard(offerDraft, hostInfo)}
            </div>
          </div>
        </div>
      </section>

      <!-- AI-Style Suggestions Panel (Simulated Rules Engine) -->
      <section style="margin-bottom: var(--space-8);">
        <div class="card flow" style="background: linear-gradient(135deg, #FAF5FF 0%, #FFFFFF 100%); border: 2px solid #8B5CF6; padding: var(--space-6);">
          <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-2);">
            <div class="flex gap-2" style="align-items: center;">
              <span style="font-size: 1.6rem;">🤖</span>
              <h3 style="margin: 0; color: #5B21B6;">Smart Demand Recommendations</h3>
            </div>
            <span class="badge" style="background-color: #EDE9FE; color: #6D28D9; border: 1px solid #C4B5FD;">Simulated AI Insights</span>
          </div>
          <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin: 0;">
            Algorithmic insights derived from real-time regional searches and pilgrim demand patterns.
          </p>

          <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--space-4); margin-top: var(--space-2);">
            <div style="background-color: #FFFFFF; border: 1.5px solid #DDD6FE; border-radius: var(--radius-md); padding: var(--space-3) var(--space-4);">
              <strong style="color: #6D28D9;">💡 Midweek Fill-Up:</strong>
              <p style="font-size: var(--font-size-xs); color: #4B5563; margin: 4px 0 0;">
                Weekday occupancy in Burwa dips by 48%. Launching a <strong>30% discount for Tuesday–Thursday</strong> attracts remote tech workers and retirees.
              </p>
            </div>

            <div style="background-color: #FFFFFF; border: 1.5px solid #DDD6FE; border-radius: var(--radius-md); padding: var(--space-3) var(--space-4);">
              <strong style="color: #6D28D9;">👨‍🦳 Senior & Pilgrim Bundle:</strong>
              <p style="font-size: var(--font-size-xs); color: #4B5563; margin: 4px 0 0;">
                72% of travellers visiting Manikaran Gurudwara and Hadimba prioritize ground-floor rooms. Tag your 4 orchard rooms as <em>Zero-Stair</em> to boost conversions.
              </p>
            </div>

            <div style="background-color: #FFFFFF; border: 1.5px solid #DDD6FE; border-radius: var(--radius-md); padding: var(--space-3) var(--space-4);">
              <strong style="color: #6D28D9;">🍎 Farm-to-Table Advantage:</strong>
              <p style="font-size: var(--font-size-xs); color: #4B5563; margin: 4px 0 0;">
                Listings with homemade breakfast packages achieve 2.4x higher repeat bookings. Uncle Ramesh's apricot jam tasting is a top highlight.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Bookings Table Section (Responsive: table on desktop, cards on mobile) -->
      <section style="margin-bottom: var(--space-8);">
        <div class="flex-between" style="margin-bottom: var(--space-3); flex-wrap: wrap;">
          <div>
            <h2 style="margin: 0; font-size: 1.4rem;">Incoming Guest Ledger</h2>
            <p style="margin: 2px 0 0; color: var(--color-text-muted); font-size: var(--font-size-xs);">
              Direct reservations including real bookings simulated from Phase 6.
            </p>
          </div>
          <span class="badge badge-verified">${2 + userBookings.length} Active Bookings</span>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; border: 1.5px solid var(--color-border);">
          <!-- Desktop Table (hidden on mobile via CSS) -->
          <div class="owner-table-wrapper" style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: var(--font-size-sm);">
              <thead style="background-color: var(--color-bg); border-bottom: 2px solid var(--color-border);">
                <tr>
                  <th style="padding: var(--space-3) var(--space-4);">Ref ID</th>
                  <th style="padding: var(--space-3) var(--space-4);">Guest Name</th>
                  <th style="padding: var(--space-3) var(--space-4);">Dates / Duration</th>
                  <th style="padding: var(--space-3) var(--space-4);">Rooms</th>
                  <th style="padding: var(--space-3) var(--space-4);">Host Net Payout (90%)</th>
                  <th style="padding: var(--space-3) var(--space-4);">Status</th>
                </tr>
              </thead>
              <tbody>
                <!-- Baseline Booking 1 -->
                <tr style="border-bottom: 1px solid var(--color-border);">
                  <td style="padding: var(--space-3) var(--space-4); font-family: monospace; font-weight: 700; color: var(--color-primary);">YL-2026-1042</td>
                  <td style="padding: var(--space-3) var(--space-4);">Meera Nambiar (Bengaluru)</td>
                  <td style="padding: var(--space-3) var(--space-4);">Tomorrow (3 Nights)</td>
                  <td style="padding: var(--space-3) var(--space-4);">1 Room (Orchard)</td>
                  <td style="padding: var(--space-3) var(--space-4); font-weight: 700; color: var(--color-success);">₹3,780</td>
                  <td style="padding: var(--space-3) var(--space-4);"><span class="badge badge-verified">✓ Confirmed</span></td>
                </tr>

                <!-- Baseline Booking 2 -->
                <tr style="border-bottom: 1px solid var(--color-border);">
                  <td style="padding: var(--space-3) var(--space-4); font-family: monospace; font-weight: 700; color: var(--color-primary);">YL-2026-2189</td>
                  <td style="padding: var(--space-3) var(--space-4);">Kapoor Family (Chandigarh)</td>
                  <td style="padding: var(--space-3) var(--space-4);">Next Weekend (2 Nights)</td>
                  <td style="padding: var(--space-3) var(--space-4);">1 Room (Ground Floor)</td>
                  <td style="padding: var(--space-3) var(--space-4); font-weight: 700; color: var(--color-success);">₹2,520</td>
                  <td style="padding: var(--space-3) var(--space-4);"><span class="badge badge-verified">✓ Confirmed</span></td>
                </tr>

                <!-- User Bookings from Phase 6 (if any) -->
                ${userBookings.map((b) => `
                  <tr style="border-bottom: 1px solid var(--color-border); background-color: #F0FDF4;">
                    <td style="padding: var(--space-3) var(--space-4); font-family: monospace; font-weight: 700; color: var(--color-primary);">${b.id}</td>
                    <td style="padding: var(--space-3) var(--space-4);">
                      <strong>${b.travellerName}</strong> ${b.travellerAge ? `(${b.travellerAge} yrs)` : ''}
                      ${b.bookingType === 'family' ? `<br><span style="font-size: 11px; color: var(--color-accent);">👨‍👩‍👧 Booked by ${b.bookerName}</span>` : ''}
                    </td>
                    <td style="padding: var(--space-3) var(--space-4);">${b.days || 3} Days trip</td>
                    <td style="padding: var(--space-3) var(--space-4);">1 Room (Senior Assured)</td>
                    <td style="padding: var(--space-3) var(--space-4); font-weight: 700; color: var(--color-success);">
                      ₹${(b.localDirectIncome || Math.round((b.grandTotal || 7000) * 0.9)).toLocaleString('en-IN')}
                    </td>
                    <td style="padding: var(--space-3) var(--space-4);"><span class="badge badge-verified">✓ Confirmed (App)</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Guest Reviews & Reputation Section (Phase 15) -->
      <section style="margin-bottom: var(--space-8);">
        <div class="card flow" style="padding: var(--space-6); border: 2px solid var(--color-border);">
          <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-2); align-items: flex-start;">
            <div>
              <div class="flex gap-2" style="align-items: center; margin-bottom: var(--space-1);">
                <span class="badge badge-verified">Community Trust Score</span>
                <span class="badge badge-demo">Sample & Verified Guest Data</span>
              </div>
              <h3 style="margin: 0; font-size: 1.35rem;">Guest Feedback & Reputation</h3>
              <p style="color: var(--color-text-muted); font-size: var(--font-size-xs); margin: 2px 0 0;">
                All ratings are submitted by travelers. Host dashboard is strictly read-only to preserve guest trust.
              </p>
            </div>
            
            <div style="text-align: right;">
              <div style="font-size: 2.2rem; font-weight: 800; color: #D97706; line-height: 1;">
                ★ ${revMetrics.averageRating || '4.9'}
              </div>
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
                Based on ${revMetrics.totalReviews || 4} guest reviews
              </span>
            </div>
          </div>

          <!-- Breakdown & Sentiment Tags Grid -->
          <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-5); margin-top: var(--space-4); padding: var(--space-4); background-color: var(--color-bg); border-radius: var(--radius-md);">
            <!-- Star breakdown -->
            <div>
              <strong style="font-size: var(--font-size-xs); text-transform: uppercase; color: var(--color-text-muted);">Star Breakdown</strong>
              <div class="rating-breakdown-bars" style="margin-top: var(--space-2);">
                ${[5, 4, 3, 2, 1].map((star) => {
                  const count = revMetrics.breakdown?.[star] || 0;
                  const pct = revMetrics.totalReviews > 0 ? Math.round((count / revMetrics.totalReviews) * 100) : 0;
                  return `
                    <div class="breakdown-bar-row">
                      <span class="breakdown-star-label">${star}★</span>
                      <div class="breakdown-bar-track">
                        <div class="breakdown-bar-fill" style="width: ${pct}%;"></div>
                      </div>
                      <span class="breakdown-count-label">${count}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Sentiment Highlights / Tags -->
            <div>
              <strong style="font-size: var(--font-size-xs); text-transform: uppercase; color: var(--color-text-muted);">Guest Sentiment & Tag Highlights</strong>
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: var(--space-2);">
                ${Object.entries(revMetrics.tagsSummary || {}).length > 0 ? Object.entries(revMetrics.tagsSummary).map(([tag, count]) => `
                  <span class="badge" style="background-color: var(--color-bg-surface); border: 1.5px solid var(--color-primary); color: var(--color-primary); font-size: var(--font-size-xs); font-weight: 600;">
                    ✓ ${tag} (${count})
                  </span>
                `).join('') : '<p style="color: var(--color-text-muted); font-size: var(--font-size-xs);">No tags recorded yet.</p>'}
              </div>
              <div style="margin-top: var(--space-3); font-size: var(--font-size-xs); color: var(--color-text-muted); background: var(--color-bg-surface); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
                💬 <strong>Host summary:</strong> High praise for Cleanliness, Authentic Food, and Warm Hospitality.
              </div>
            </div>
          </div>

          <!-- Reviews list -->
          <div style="margin-top: var(--space-4);">
            <strong style="font-size: var(--font-size-sm); color: var(--color-text-main);">Recent Guest Reviews (Read-Only):</strong>
            <div class="flow" style="margin-top: var(--space-3); gap: var(--space-3);" id="owner-reviews-list"></div>
          </div>
        </div>
      </section>

      <!-- Monetization & Subscription Teaser Card -->
      <section>
        <div class="card flow" style="border: 2px dashed #0D5C5B; background: linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%); padding: var(--space-6);">
          <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-2);">
            <div>
              <span class="badge badge-demo">Concept / Business Model</span>
              <h3 style="margin: var(--space-1) 0 0;">YatraLocal Fair Tourism Revenue Engine</h3>
            </div>
            <strong style="color: var(--color-primary); font-size: 1.15rem;">Sustainable & Transparent</strong>
          </div>

          <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin: 0;">
            Unlike major aggregator OTAs that extract 25–35% commissions from small hotels, YatraLocal operates on an ethical revenue model designed for long-term Indian hospitality.
          </p>

          <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-4); font-size: var(--font-size-sm); margin-top: var(--space-2);">
            <div style="background-color: var(--color-bg); padding: var(--space-3); border-radius: var(--radius-md);">
              <strong style="color: var(--color-primary);">1. 10% Community Fee:</strong>
              <p style="margin: 4px 0 0; color: var(--color-text-muted); font-size: var(--font-size-xs);">
                90% stays directly with the host family. 10% finances platform hosting, real AI integrations, and the emergency SOS beacon.
              </p>
            </div>

            <div style="background-color: var(--color-bg); padding: var(--space-3); border-radius: var(--radius-md);">
              <strong style="color: var(--color-accent);">2. Verified Village Badge:</strong>
              <p style="margin: 4px 0 0; color: var(--color-text-muted); font-size: var(--font-size-xs);">
                Free on-ground inspection for authentic farmstays and senior-accessible homestays to assure traveller safety.
              </p>
            </div>

            <div style="background-color: var(--color-bg); padding: var(--space-3); border-radius: var(--radius-md);">
              <strong style="color: var(--color-success);">3. Host Pro Subscription (₹299/mo):</strong>
              <p style="margin: 4px 0 0; color: var(--color-text-muted); font-size: var(--font-size-xs);">
                Automated seasonal flash discount notifications, WhatsApp booking alerts, and priority search ranking during off-peak months.
              </p>
            </div>
          </div>
        </div>
      </section>
    `;

    bindDashboardListeners();

    const reviewsListEl = container.querySelector('#owner-reviews-list');
    if (reviewsListEl) {
      if (hostReviews.length === 0) {
        reviewsListEl.innerHTML = '<p style="color: var(--color-text-muted); font-size: var(--font-size-sm);">No reviews yet.</p>';
      } else {
        hostReviews.forEach((rev) => {
          reviewsListEl.appendChild(createReviewCardDOM(rev, false));
        });
      }
    }
  }

  function renderPreviewCard(draft, host) {
    const discountedPrice = Math.round(host.basePrice * (1 - (draft.discountPercent / 100)));

    return `
      <article class="card flow" style="border: 2px solid var(--color-primary); box-shadow: var(--shadow-md);">
        <!-- Visual Banner with live ribbon -->
        <div style="background: linear-gradient(135deg, #1E6F5C, #2E8B57); height: 110px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; padding: var(--space-4); position: relative;">
          <div style="font-size: 3rem;">🏡</div>
          <div style="background-color: var(--color-accent); color: white; padding: 0.25rem 0.6rem; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 700; box-shadow: var(--shadow-sm);">
            🎉 ${draft.discountPercent}% Off-Peak Offer ⚡ Live
          </div>
        </div>

        <div class="flex gap-2" style="flex-wrap: wrap; margin-top: var(--space-2);">
          <span class="badge badge-verified">✓ Verified Local</span>
          <span class="badge badge-local">📍 Supports a Local Family</span>
          <span class="badge badge-verified">♿ Senior Friendly</span>
        </div>

        <h3 style="margin: var(--space-2) 0 0; font-size: 1.25rem;">${host.name}</h3>
        <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0;">📍 ${host.area}</p>

        <div style="background-color: var(--color-bg); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: var(--font-size-xs); border: 1px solid var(--color-border);" class="flex-between">
          <span>🛏️ Rooms Available:</span>
          <strong>${draft.roomsOffered} of ${host.roomsTotal} empty</strong>
        </div>

        <p style="font-size: var(--font-size-xs); color: var(--color-text-main); margin: 0; background-color: #FEF3C7; padding: var(--space-2); border-radius: var(--radius-sm); border: 1px solid #FCD34D;">
          🎁 <strong>Host Perk:</strong> ${draft.promoMessage}
        </p>

        <div style="padding-top: var(--space-3); border-top: 1px solid var(--color-border);" class="flex-between">
          <div>
            <div style="font-size: 1.35rem; font-weight: 700; color: var(--color-primary);">
              ₹${discountedPrice.toLocaleString('en-IN')}
              <span style="font-size: var(--font-size-xs); font-weight: normal; color: var(--color-text-muted);">/night</span>
            </div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-decoration: line-through;">
              ₹${host.basePrice.toLocaleString('en-IN')}
            </div>
          </div>
          <span class="badge badge-verified">Preview Only</span>
        </div>
      </article>
    `;
  }

  function bindDashboardListeners() {
    // Logout button
    container.querySelector('#btn-owner-logout')?.addEventListener('click', () => {
      store.logoutOwner();
      renderView();
    });

    // Offer Builder Form Inputs
    const discountSlider = container.querySelector('#inp-offer-discount');
    const discountVal = container.querySelector('#val-discount');
    const roomsSlider = container.querySelector('#inp-offer-rooms');
    const roomsVal = container.querySelector('#val-rooms');
    const datesInput = container.querySelector('#inp-offer-dates');
    const msgInput = container.querySelector('#inp-offer-msg');
    const previewBox = container.querySelector('#offer-live-preview-box');

    const updatePreview = () => {
      offerDraft.discountPercent = parseInt(discountSlider.value, 10);
      offerDraft.roomsOffered = parseInt(roomsSlider.value, 10);
      offerDraft.dates = datesInput.value;
      offerDraft.promoMessage = msgInput.value;

      if (discountVal) discountVal.textContent = `${offerDraft.discountPercent}%`;
      if (roomsVal) roomsVal.textContent = `${offerDraft.roomsOffered} Rooms`;
      if (previewBox) previewBox.innerHTML = renderPreviewCard(offerDraft, hostInfo);
    };

    discountSlider?.addEventListener('input', updatePreview);
    roomsSlider?.addEventListener('input', updatePreview);
    datesInput?.addEventListener('input', updatePreview);
    msgInput?.addEventListener('input', updatePreview);

    // Publish Offer button
    container.querySelector('#btn-publish-offer')?.addEventListener('click', () => {
      const discountedPrice = Math.round(hostInfo.basePrice * (1 - (offerDraft.discountPercent / 100)));
      store.saveHostOffer(hostInfo.id, {
        discountPercent: offerDraft.discountPercent,
        roomsOffered: offerDraft.roomsOffered,
        dates: offerDraft.dates,
        promoMessage: offerDraft.promoMessage,
        discountedPrice
      });

      window.YatraApp.showToast(`🎉 Offer published! ${offerDraft.discountPercent}% Off-Peak discount is now live on YatraLocal search!`);
    });
  }

  // Initial mount with preloaded seed reviews and seasons data
  Promise.all([
    reviewsManager.loadSeedReviews(),
    loadSeasonsData()
  ]).then(() => {
    renderView();
  }).catch(() => {
    renderView();
  });

  return container;
}
