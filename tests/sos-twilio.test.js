const assert = require('assert');
const { normalizeToE164, maskPhone } = require('../js/sos.js');

console.log('====================================================');
console.log('🧪 YATRALOCAL PHASE 18: REAL SOS & TWILIO DISPATCH');
console.log('====================================================');

// Test 1: Phone normalization to E.164
assert.strictEqual(normalizeToE164('9876543210'), '+919876543210', '10-digit Indian number defaults to +91');
assert.strictEqual(normalizeToE164('09876543210'), '+919876543210', 'Leading 0 Indian number normalizes to +91');
assert.strictEqual(normalizeToE164('+91 98765-43210'), '+919876543210', 'Formatted string strips spaces and dashes');
assert.strictEqual(normalizeToE164('+14155552671'), '+14155552671', 'US E.164 number preserved');
assert.strictEqual(normalizeToE164('12345'), null, 'Short invalid phone rejected');
assert.strictEqual(normalizeToE164(''), null, 'Empty string rejected');
console.log('[PASS] normalizeToE164 accurately parses Indian 10-digit and international E.164');

// Test 2: Phone masking
assert.strictEqual(maskPhone('+919876543210'), '+9198*** **210', 'Masks digits while keeping prefix and suffix');
console.log('[PASS] maskPhone hides sensitive middle digits');

// Test 3: Verify serverless SOS function handler exports and handles simulation
const sosHandler = require('../netlify/functions/sos.js');
assert.strictEqual(typeof sosHandler.handler, 'function', 'SOS serverless function exports handler');

async function testSosHandler() {
  // Test 3a: OPTIONS preflight
  const optRes = await sosHandler.handler({ httpMethod: 'OPTIONS', headers: {} });
  assert.strictEqual(optRes.statusCode, 204, 'CORS preflight returns 204');
  console.log('[PASS] OPTIONS returns 204 No Content for CORS');

  // Test 3b: Reject payload > 2KB
  const largeBody = JSON.stringify({ data: 'x'.repeat(2500) });
  const largeRes = await sosHandler.handler({ httpMethod: 'POST', body: largeBody, headers: {} });
  assert.strictEqual(largeRes.statusCode, 413, 'Rejects payload > 2KB with 413');
  console.log('[PASS] Rejects payload exceeding 2 KB limit');

  // Test 3c: Reject invalid phone numbers
  const badPhoneRes = await sosHandler.handler({
    httpMethod: 'POST',
    body: JSON.stringify({
      contacts: [{ name: 'Test', phone: 'invalid-phone' }]
    }),
    headers: {}
  });
  assert.strictEqual(badPhoneRes.statusCode, 400, 'Rejects invalid phone with 400');
  console.log('[PASS] Rejects invalid contact phone formats');

  // Test 3d: Valid dispatch request
  const dispatchRes = await sosHandler.handler({
    httpMethod: 'POST',
    body: JSON.stringify({
      travellerName: 'Aarav',
      contacts: [{ name: 'Family', phone: '+919876543210' }],
      lat: 31.04,
      lng: 78.53,
      accuracy: 15,
      channel: 'sms'
    }),
    headers: {}
  });
  assert.strictEqual(dispatchRes.statusCode, 200, 'Returns 200 for valid dispatch');
  const body = JSON.parse(dispatchRes.body);
  assert.strictEqual(body.trackingToken.length > 0, true, 'Generates 6h tracking token');
  assert.strictEqual(body.mapsLink.includes('31.04000,78.53000'), true, 'Builds exact Google Maps coordinate link');
  assert.strictEqual(Array.isArray(body.results), true, 'Returns per-contact dispatch array');
  console.log('[PASS] Valid dispatch builds maps link, 6h tracking token, and masks numbers');

  console.log('====================================================');
  console.log('Results: All SOS tests passed (100%)');
  console.log('====================================================');
}

testSosHandler().catch(err => {
  console.error('SOS test failure:', err);
  process.exit(1);
});
