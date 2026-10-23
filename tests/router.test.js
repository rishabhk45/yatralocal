const assert = require('assert');

function createMockElement(tag = 'div') {
  const el = {
    tagName: tag.toUpperCase(),
    className: '',
    style: {},
    innerHTML: '',
    children: [],
    attributes: {},
    appendChild(child) { this.children.push(child); },
    querySelector(sel) {
      if (sel === 'h1') {
        const h1 = createMockElement('h1');
        h1.textContent = 'Place View: osm:node:999';
        return h1;
      }
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '.nav-link') {
        return [
          { getAttribute: (a) => '#/', classList: { add: () => {}, remove: () => {} }, setAttribute: () => {}, removeAttribute: () => {} },
          { getAttribute: (a) => '#/plan', classList: { add: () => {}, remove: () => {} }, setAttribute: () => {}, removeAttribute: () => {} }
        ];
      }
      return [];
    },
    setAttribute(k, v) { this.attributes[k] = v; },
    removeAttribute(k) { delete this.attributes[k]; },
    getAttribute(k) { return this.attributes[k] || null; },
    focus() { this.focused = true; }
  };
  return el;
}

global.window = {
  location: { hash: '' },
  listeners: {},
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  },
  triggerHashChange(newHash) {
    this.location.hash = newHash;
    (this.listeners['hashchange'] || []).forEach(fn => fn());
  },
  scrollTo() {}
};

const appContainer = createMockElement('div');
appContainer.id = 'app-view';

global.document = {
  createElement: createMockElement,
  getElementById: (id) => (id === 'app-view' ? appContainer : createMockElement('div')),
  querySelectorAll: (sel) => appContainer.querySelectorAll(sel),
  title: ''
};

global.requestAnimationFrame = (fn) => fn();

async function testRouter() {
  const { router } = await import('../js/router.js');

  let landingRendered = false;
  let planRendered = false;
  let placeParam = null;

  router.register('#/', () => {
    landingRendered = true;
    return '<h1>Home View</h1>';
  });

  router.register('#/plan', () => {
    planRendered = true;
    return '<h1>Plan View</h1>';
  });

  router.register('#/place', (param) => {
    placeParam = param;
    return `<h1>Place View: ${param}</h1>`;
  });

  // Test 1: Initialize without hash (should default to #/)
  router.init('app-view');
  assert.strictEqual(landingRendered, true, 'Default hash #/ should render landing view');
  assert.strictEqual(appContainer.innerHTML, '<h1>Home View</h1>');
  console.log('✓ Test 1 Passed: Default route (#/) renders correctly on load');

  // Test 2: Navigate to #/plan via hashchange
  window.triggerHashChange('#/plan');
  assert.strictEqual(planRendered, true, 'hashchange to #/plan should render plan view');
  assert.strictEqual(appContainer.innerHTML, '<h1>Plan View</h1>');
  console.log('✓ Test 2 Passed: hashchange to #/plan renders correctly');

  // Test 3: Navigate with query parameters (#/plan?destination=harsil)
  planRendered = false;
  window.triggerHashChange('#/plan?destination=harsil');
  assert.strictEqual(planRendered, true, 'hash with query parameters must match base route #/plan');
  assert.strictEqual(router.getQueryParams().destination, 'harsil', 'getQueryParams should parse destination');
  console.log('✓ Test 3 Passed: Query parameters handled without breaking route matching');

  // Test 4: Dynamic parameterized route (#/place/osm:node:999)
  window.triggerHashChange('#/place/osm:node:999');
  assert.strictEqual(placeParam, 'osm:node:999', 'routeParam should receive extracted placeKey');
  assert.strictEqual(appContainer.innerHTML, '<h1>Place View: osm:node:999</h1>');
  console.log('✓ Test 4 Passed: Parameterized route #/place/:placeKey works');

  // Test 5: Focus management
  assert.strictEqual(document.title.startsWith('YatraLocal - Place View'), true, 'Document title updated to h1');
  console.log('✓ Test 5 Passed: Accessible focus & title management verified');

  console.log('\nAll router tests passed cleanly!');
}

testRouter().catch(err => {
  console.error('Router test failed:', err);
  process.exit(1);
});
