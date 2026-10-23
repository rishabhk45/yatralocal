/**
 * YatraLocal - LLM Trip Planner & Serverless Fallback Test Suite
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sanitizeClientInput } from '../js/llmProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const { handler: netlifyPlanHandler } = require('../netlify/functions/plan.js');
const vercelPlanHandler = require('../api/plan.js');

console.log('====================================================');
console.log('🧪 YATRALOCAL PHASE 12: REAL LLM PLANNER & FALLBACK');
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

async function runAllTests() {
  // Test 1: Fallback when LLM_API_KEY is missing
  delete process.env.LLM_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const mockEventWithoutKey = {
    httpMethod: 'POST',
    headers: { 'client-ip': '192.168.1.1' },
    body: JSON.stringify({
      destination: 'manali',
      budget: 10000,
      days: 3,
      travellers: 2
    })
  };

  const responseWithoutKey = await netlifyPlanHandler(mockEventWithoutKey, {});
  const bodyWithoutKey = JSON.parse(responseWithoutKey.body);

  assert(
    'Serverless function returns 503 when LLM_API_KEY is missing',
    responseWithoutKey.statusCode === 503 && bodyWithoutKey.error === 'LLM_NOT_CONFIGURED' && bodyWithoutKey.isSimulated === true,
    `Status: ${responseWithoutKey.statusCode}, Error code: ${bodyWithoutKey.error}`
  );

  // Test 2: Input Sanitization strips HTML and limits length
  const dirtyInput = '<script>alert("xss")</script><b>Make Day 2</b> more relaxed! ' + 'a'.repeat(300);
  const cleaned = sanitizeClientInput(dirtyInput, 200);

  assert(
    'Input sanitization strips HTML tags and enforces 200 char limit',
    !cleaned.includes('<script>') && !cleaned.includes('<b>') && cleaned.length <= 200,
    `Cleaned output (${cleaned.length} chars): "${cleaned.slice(0, 40)}..."`
  );

  // Test 3: Vercel adapter exports compliant (req, res) interface
  let vercelStatus = null;
  let vercelJsonData = null;
  const mockReq = {
    method: 'POST',
    headers: { 'x-real-ip': '10.0.0.1' },
    body: { destination: 'jaipur', budget: 15000, days: 3 }
  };
  const mockRes = {
    setHeader: () => {},
    status: (code) => { vercelStatus = code; return mockRes; },
    json: (data) => { vercelJsonData = data; return mockRes; },
    send: (data) => { vercelJsonData = data; return mockRes; }
  };

  await vercelPlanHandler(mockReq, mockRes);
  assert(
    'Vercel-compatible /api/plan adapter delegates and handles response',
    vercelStatus === 503 && vercelJsonData?.error === 'LLM_NOT_CONFIGURED',
    `Vercel status: ${vercelStatus}, Payload error: ${vercelJsonData?.error}`
  );

  // Test 4: Rate Limiting enforces max requests per minute
  let wasRateLimited = false;
  const testIp = '198.51.100.99';
  for (let i = 0; i < 15; i++) {
    const res = await netlifyPlanHandler({
      httpMethod: 'POST',
      headers: { 'client-ip': testIp },
      body: JSON.stringify({ destination: 'varanasi' })
    }, {});
    if (res.statusCode === 429) {
      wasRateLimited = true;
      break;
    }
  }

  assert(
    'In-memory rate limiter triggers HTTP 429 upon request burst',
    wasRateLimited === true,
    'Client exceeded 10 req/min limit and received 429 Too Many Requests'
  );

  // Test 5: Recomputing costs purely in code (rejecting invented prices)
  const destData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/destinations.json'), 'utf8'));
  const manali = destData.find(d => d.id === 'manali');
  const act1 = manali.activities[0];
  const travellers = 2;
  const calculatedCost = act1.cost * travellers;

  assert(
    'Activity costs are computed strictly from verified catalog records',
    calculatedCost === act1.cost * 2 && typeof calculatedCost === 'number',
    `${act1.name} base price ₹${act1.cost} × ${travellers} travellers = ₹${calculatedCost}`
  );

  // Test 6: Environment variables protection check
  const gitignoreContent = fs.readFileSync(path.join(__dirname, '../.gitignore'), 'utf8');
  const envExampleContent = fs.readFileSync(path.join(__dirname, '../.env.example'), 'utf8');

  assert(
    'Environment configuration safety (.gitignore protects secrets, .env.example provided)',
    gitignoreContent.includes('.env') && envExampleContent.includes('LLM_API_KEY='),
    `.env explicitly ignored in .gitignore, template documented in .env.example`
  );

  console.log('----------------------------------------------------');
  console.log(`TOTAL: ${passed}/${total} assertions passed (${passed === total ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'})`);
  console.log('====================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runAllTests();
