/**
 * YatraLocal - My Trips Dashboard (#/trips)
 * Displays all confirmed simulated bookings saved in localStorage.
 * Provides easy access to digital vouchers, .ics calendar downloads, and WhatsApp sharing.
 */

import { store } from '../js/store.js';

export function renderTripsView() {
  const container = document.createElement('div');
  container.className = 'container';
  container.style.maxWidth = '960px';
  container.style.margin = '0 auto';
  container.style.padding = 'var(--space-8) var(--space-4) 100px var(--space-4)';

  const bookings = store.getBookings();

  container.innerHTML = `
    <!-- Top Header -->
    <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-6); align-items: flex-end;">
      <div>
        <div class="flex gap-2" style="align-items: center; margin-bottom: var(--space-2);">
          <span class="badge badge-verified">Community Travel Ledger</span>
          <span class="badge badge-demo">Simulated Bookings</span>
        </div>
        <h1 style="margin: 0; font-size: clamp(1.8rem, 4vw, 2.4rem);">My Booked Trips</h1>
        <p style="color: var(--color-text-muted); margin-top: var(--space-1); margin-bottom: 0;">
          All upcoming and past journeys booked directly with local families.
        </p>
      </div>

      <div>
        <a href="#/plan" class="btn btn-primary">
          + Plan New Trip
        </a>
      </div>
    </div>

    <!-- Bookings List or Empty State -->
    ${bookings.length === 0 ? `
      <!-- Empty State -->
      <div class="card flow" style="text-align: center; padding: var(--space-12) var(--space-6); border: 2px dashed var(--color-border);">
        <div style="font-size: 3.5rem;">🧳</div>
        <h2>No bookings found yet</h2>
        <p style="color: var(--color-text-muted); max-width: 500px; margin: 0 auto var(--space-6);">
          You haven't reserved any local homestays or community guides yet. Start planning a trip or try our easy Saral Mode.
        </p>
        <div class="flex-center gap-3" style="flex-wrap: wrap;">
          <a href="#/plan" class="btn btn-primary">
            Plan My Trip ➔
          </a>
          <a href="#/saral" class="btn btn-secondary">
            ☀️ Try Saral Mode
          </a>
        </div>
      </div>
    ` : `
      <div class="flow" style="gap: var(--space-6);">
        ${bookings.map((b) => renderTripCard(b)).join('')}
      </div>
    `}
  `;

  // Bind interaction listeners
  bindTripsListeners(container, bookings);

  return container;
}

function renderTripCard(b) {
  const stayName = b.stay?.name || b.stayName || 'Local Homestay';
  const guideName = b.guide?.name || b.guideName || 'Local Guide';
  const stayArea = b.stay?.area || b.destination;
  const stayPhone = b.stay?.phone || '+91 98160 44221';
  const guidePhone = b.guide?.phone || '+91 94180 55663';
  const total = b.grandTotal || 0;
  const days = b.days || 3;
  const travellerName = b.travellerName || 'Traveller';

  const shareText = encodeURIComponent(
    `🎉 YatraLocal Booking Confirmed!\nDestination: ${b.destination}\nBooking ID: ${b.id}\nStay: ${stayName}\nGuide: ${guideName}\nTotal: ₹${total}`
  );

  return `
    <article class="card flow" style="border: 2px solid var(--color-border); padding: var(--space-6); background-color: var(--color-bg-surface); box-shadow: var(--shadow-sm);" data-id="${b.id}">
      <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-2); border-bottom: 1.5px solid var(--color-border); padding-bottom: var(--space-3);">
        <div>
          <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-weight: 700;">BOOKING REF:</span>
          <strong style="color: var(--color-primary); font-size: 1.15rem; letter-spacing: 0.05em; margin-left: 6px;">${b.id}</strong>
        </div>
        <div class="flex gap-2">
          <span class="badge badge-verified">✓ Confirmed (Simulated)</span>
          ${b.bookingType === 'family' ? '<span class="badge badge-local">👨‍👩‍👧 Family-Assisted</span>' : ''}
        </div>
      </div>

      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-5); margin-top: var(--space-4);">
        <div>
          <h3 style="margin: 0 0 var(--space-1) 0; font-size: 1.4rem; color: var(--color-text-main);">
            📍 ${b.destination} (${days} Days)
          </h3>
          <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin: 0 0 var(--space-2) 0;">
            Primary Traveller: <strong>${travellerName}</strong> ${b.travellerAge ? `(${b.travellerAge} yrs)` : ''}
          </p>

          ${b.bookingType === 'family' ? `
            <div style="font-size: var(--font-size-xs); color: var(--color-accent-hover); background-color: #FEF3C7; padding: var(--space-2); border-radius: var(--radius-sm); border: 1px solid #FCD34D;">
              Booked by <strong>${b.bookerName || 'Family'}</strong> (${b.bookerRelation || 'Family'}) • Updates mirrored to ${b.bookerPhone}
            </div>
          ` : ''}
        </div>

        <div>
          <div style="font-size: var(--font-size-sm); margin-bottom: var(--space-2);">
            <strong>🏡 Stay:</strong> ${stayName} (📍 ${stayArea})<br>
            <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Host Contact: ${stayPhone}</span>
          </div>
          <div style="font-size: var(--font-size-sm);">
            <strong>🪪 Guide:</strong> ${guideName}<br>
            <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Guide Contact: ${guidePhone}</span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start;">
          <div>
            <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Total Paid (Demo):</span>
            <div style="font-size: 1.6rem; font-weight: 800; color: var(--color-primary);">₹${total.toLocaleString('en-IN')}</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-success); font-weight: 600;">
              ✓ ₹${(b.localDirectIncome || Math.round(total * 0.9)).toLocaleString('en-IN')} kept locally
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons Row -->
      <div class="flex-between" style="border-top: 1px solid var(--color-border); padding-top: var(--space-4); margin-top: var(--space-4); flex-wrap: wrap; gap: var(--space-2);">
        <div class="flex gap-2">
          <button type="button" class="btn btn-ghost btn-sm btn-download-ics" data-id="${b.id}">
            📅 Download .ics
          </button>
          <a href="https://api.whatsapp.com/send?text=${shareText}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm" style="color: #128C7E; border-color: #25D366;">
            💬 WhatsApp
          </a>
        </div>

        <div>
          <button type="button" class="btn btn-secondary btn-sm btn-view-voucher" data-id="${b.id}">
            🎟️ View Voucher & QR ➔
          </button>
        </div>
      </div>
    </article>
  `;
}

function bindTripsListeners(container, bookings) {
  // Download .ics
  container.querySelectorAll('.btn-download-ics').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const booking = bookings.find((x) => x.id === id);
      if (booking) downloadBookingICS(booking);
    });
  });

  // View voucher in modal
  container.querySelectorAll('.btn-view-voucher').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const b = bookings.find((x) => x.id === id);
      if (b) openVoucherModal(b);
    });
  });
}

function downloadBookingICS(b) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (b.days || 3));

  const formatICSDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//YatraLocal//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${b.id}@yatralocal.org`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:YatraLocal: ${b.destination}`,
    `DESCRIPTION:Booking ${b.id}\\nStay: ${b.stay?.name || 'Homestay'}\\nGuide: ${b.guide?.name || 'Guide'}`,
    `LOCATION:${b.destination}, India`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `YatraLocal-${b.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  window.YatraApp.showToast('📅 iCalendar (.ics) downloaded!');
}

function openVoucherModal(b) {
  const stayName = b.stay?.name || b.stayName || 'Local Homestay';
  const guideName = b.guide?.name || b.guideName || 'Local Guide';

  const content = `
    <div class="flow" style="font-size: var(--font-size-sm);">
      <div class="flex-between" style="border-bottom: 2px dashed var(--color-border); padding-bottom: var(--space-4);">
        <div>
          <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">CONFIRMED VOUCHER</span>
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--color-primary);">${b.id}</div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Booked on: ${new Date(b.createdAt).toLocaleDateString()}</div>
        </div>

        <svg width="70" height="70" viewBox="0 0 100 100" style="border: 2px solid #000; padding: 2px; background: #fff;">
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
        </svg>
      </div>

      <div class="grid" style="grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-top: var(--space-3);">
        <div>
          <strong>Destination:</strong> ${b.destination}
        </div>
        <div>
          <strong>Traveller:</strong> ${b.travellerName || 'Traveller'}
        </div>
        <div>
          <strong>Homestay:</strong> ${stayName}
        </div>
        <div>
          <strong>Guide:</strong> ${guideName}
        </div>
      </div>

      <div style="background-color: var(--color-bg); padding: var(--space-3); border-radius: var(--radius-sm); font-size: var(--font-size-xs); margin-top: var(--space-2);">
        📞 Host Contact: <strong>${b.stay?.phone || '+91 98160 44221'}</strong><br>
        🎓 Guide Contact: <strong>${b.guide?.phone || '+91 94180 55663'}</strong>
      </div>

      <div style="text-align: right; margin-top: var(--space-4);">
        <button type="button" class="btn btn-primary btn-sm" onclick="window.YatraApp.closeModal()">Close Voucher</button>
      </div>
    </div>
  `;

  window.YatraApp.openModal({
    title: `Trip Voucher — ${b.id}`,
    content
  });
}
