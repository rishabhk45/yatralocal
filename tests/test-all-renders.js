// Mock minimal DOM environment
global.window = {
  location: { hash: '#/' },
  addEventListener: () => {},
  scrollTo: () => {},
  innerWidth: 1200,
  isSecureContext: true
};

function createMockElement(tag = 'div') {
  return {
    tagName: tag.toUpperCase(),
    className: '',
    style: {},
    innerHTML: '',
    textContent: '3',
    appendChild: () => {},
    querySelector: (sel) => createMockElement('div'),
    querySelectorAll: () => [],
    addEventListener: () => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    getAttribute: () => null,
    contains: () => false,
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => false,
      contains: () => false
    }
  };
}

global.document = {
  createElement: createMockElement,
  getElementById: (id) => createMockElement('div'),
  querySelectorAll: () => [],
  addEventListener: () => {},
  documentElement: {
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => false,
      contains: () => false
    }
  }
};

global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

global.sessionStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

global.navigator = {
  geolocation: {
    getCurrentPosition: () => {},
    watchPosition: () => 1,
    clearWatch: () => {}
  }
};

global.requestAnimationFrame = (fn) => fn();

async function run() {
  const landing = await import('../pages/landing.js');
  const plan = await import('../pages/plan.js');
  const itinerary = await import('../pages/itinerary.js');
  const stays = await import('../pages/stays.js');
  const saral = await import('../pages/saral.js');
  const booking = await import('../pages/booking.js');
  const trips = await import('../pages/trips.js');
  const owner = await import('../pages/owner.js');
  const sos = await import('../pages/sos.js');
  const notFound = await import('../pages/not-found.js');
  const styleGuide = await import('../pages/style-guide.js');
  const place = await import('../pages/place.js');

  const views = [
    { name: 'landing', fn: landing.renderLandingView },
    { name: 'plan', fn: plan.renderPlanView },
    { name: 'itinerary', fn: itinerary.renderItineraryView },
    { name: 'stays', fn: stays.renderStaysView },
    { name: 'saral', fn: saral.renderSaralView },
    { name: 'booking', fn: booking.renderBookingView },
    { name: 'trips', fn: trips.renderTripsView },
    { name: 'owner', fn: owner.renderOwnerView },
    { name: 'sos', fn: sos.renderSosView },
    { name: 'notFound', fn: notFound.renderNotFoundView },
    { name: 'styleGuide', fn: styleGuide.renderStyleGuide },
    { name: 'place', fn: place.renderPlaceView }
  ];

  let passed = 0;
  for (const v of views) {
    try {
      const res = v.fn();
      console.log(`PASS: ${v.name} rendered successfully (${typeof res})`);
      passed++;
    } catch (err) {
      console.error(`FAIL: ${v.name} threw error:`, err);
    }
  }

  console.log(`\nResults: ${passed} / ${views.length} views passed!`);
  if (passed === views.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run().catch(console.error);
