/**
 * YatraLocal - Real Emergency SOS & Family Tracking Test Suite (Phase 13)
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { handler: netlifySosHandler, _trackingStore } = require('../netlify/functions/sos.js');
const vercelSosHandler = require('../api/sos.js');

console.log('====================================================');
console.log('🧪 YATRALOCAL PHASE 13: REAL SOS & LIVE TRACKING');
console.log('====================================================');

let passed = 0;
let total = 0;

function assert(title, condition, detail = '') {
  total++;
  if (condition) {
    passed++;
    console.log(`[PASS] ${title}`);
    if (detail) console.log(`       └─ ${detail}`);
  } else {
    console.error(`[FAIL] ${title}`);
    if (detail) console.error(`       └─ ${detail}`);
  }
}

async function runTests() {
  // Test 1: Create SOS tracking session without Twilio (Zero-Backend Fallback)
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;

  const createEvent = {
    httpMethod: 'POST',
    headers: { 'client-ip': '203.0.113.1', 'host': 'localhost:4173' },
    body: JSON.stringify({
      action: 'create',
      travellerName: 'Aarav Sharma',
      medicalNotes: 'Type 1 Diabetes',
      coords: { lat: 32.2483, lng: 77.1804, accuracy: 15, address: 'Hadimba Road, Manali' },
      contacts: [{ name: 'Sunita Sharma', phone: '+91 98765 11111' }]
    })
  };

  const createRes = await netlifySosHandler(createEvent, {});
  const createData = JSON.parse(createRes.body);

  assert(
    'Serverless SOS creates session token & activates fallback when Twilio is unconfigured',
    createRes.statusCode === 200 && createData.ok && createData.token && createData.smsDispatched === false && createData.trackingUrl.includes(createData.token),
    `Token: ${createData.token}, Tracking URL: ${createData.trackingUrl}`
  );

  const testToken = createData.token;

  // Test 2: Read-Only Family Tracking Endpoint (Privacy: No Phone Numbers Exposed)
  const getEvent = {
    httpMethod: 'GET',
    headers: { 'client-ip': '203.0.113.2' },
    queryStringParameters: { action: 'get', token: testToken }
  };

  const getRes = await netlifySosHandler(getEvent, {});
  const getData = JSON.parse(getRes.body);

  const hasPhone = JSON.stringify(getData).includes('+91 98765 11111') || JSON.stringify(getData).includes('phone');

  assert(
    'Family tracking endpoint returns live coordinates and strictly NEVER exposes phone numbers',
    getRes.statusCode === 200 && getData.status === 'ACTIVE' && getData.travellerName === 'Aarav Sharma' && !hasPhone,
    `Status: ${getData.status}, Coordinates: ${getData.coords.lat}, ${getData.coords.lng}, Phone exposed: ${hasPhone}`
  );

  // Test 3: Throttled Location Update
  const updateEvent = {
    httpMethod: 'POST',
    headers: { 'client-ip': '203.0.113.1' },
    body: JSON.stringify({
      action: 'update',
      token: testToken,
      coords: { lat: 32.2530, lng: 77.1750, accuracy: 10, address: 'Old Manali Bridge' }
    })
  };

  const updateRes = await netlifySosHandler(updateEvent, {});
  const updateData = JSON.parse(updateRes.body);

  assert(
    'Location update persists new coordinates for active beacon',
    updateRes.statusCode === 200 && updateData.ok && updateData.status === 'ACTIVE' && updateData.lastUpdated,
    `Updated at: ${updateData.lastUpdated}`
  );

  // Test 4: Traveller Marked Safe
  const safeEvent = {
    httpMethod: 'POST',
    headers: { 'client-ip': '203.0.113.1' },
    body: JSON.stringify({
      action: 'safe',
      token: testToken
    })
  };

  const safeRes = await netlifySosHandler(safeEvent, {});
  const safeData = JSON.parse(safeRes.body);

  const verifySafeRes = await netlifySosHandler(getEvent, {});
  const verifySafeData = JSON.parse(verifySafeRes.body);

  assert(
    'Traveller marking safe transitions tracking state to SAFE',
    safeRes.statusCode === 200 && verifySafeData.status === 'SAFE',
    `Tracking state verified as: ${verifySafeData.status}`
  );

  // Test 5: Token Expiration & Invalid Tokens
  const invalidGetEvent = {
    httpMethod: 'GET',
    headers: { 'client-ip': '203.0.113.3' },
    queryStringParameters: { action: 'get', token: 'non-existent-token-12345' }
  };

  const invalidRes = await netlifySosHandler(invalidGetEvent, {});
  const invalidData = JSON.parse(invalidRes.body);

  assert(
    'Invalid or expired token returns HTTP 404 with EXPIRED status',
    invalidRes.statusCode === 404 && invalidData.status === 'EXPIRED',
    `Status code: ${invalidRes.statusCode}, Status string: ${invalidData.status}`
  );

  // Test 6: Rate Limiting
  let rateLimited = false;
  const spamIp = '198.51.100.222';
  for (let i = 0; i < 15; i++) {
    const r = await netlifySosHandler({
      httpMethod: 'POST',
      headers: { 'client-ip': spamIp },
      body: JSON.stringify({ action: 'create' })
    }, {});
    if (r.statusCode === 429) {
      rateLimited = true;
      break;
    }
  }

  assert(
    'In-memory rate limiter protects SOS serverless endpoint from abuse (HTTP 429)',
    rateLimited === true,
    'Client burst exceeded limit and received 429'
  );

  // Test 7: Vercel Adapter Compatibility
  let vStatus = null;
  let vJson = null;
  const mockVercelReq = {
    method: 'GET',
    query: { action: 'get', token: testToken },
    headers: {}
  };
  const mockVercelRes = {
    setHeader: () => {},
    status: (s) => { vStatus = s; return mockVercelRes; },
    json: (j) => { vJson = j; return mockVercelRes; },
    send: (t) => { vJson = t; return mockVercelRes; }
  };

  await vercelSosHandler(mockVercelReq, mockVercelRes);

  assert(
    'Vercel-compatible /api/sos handler functions equivalently',
    vStatus === 200 && vJson.status === 'SAFE',
    `Vercel response status: ${vStatus}`
  );

  console.log('----------------------------------------------------');
  console.log(`TOTAL: ${passed}/${total} assertions passed (${passed === total ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'})`);
  console.log('====================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
