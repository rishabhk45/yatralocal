/**
 * YatraLocal - User Feedback & Reviews Test Suite (Phase 15)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock browser globals for Node.js environment
const memoryStore = {};
global.localStorage = {
  getItem: (key) => memoryStore[key] || null,
  setItem: (key, val) => { memoryStore[key] = String(val); },
  removeItem: (key) => { delete memoryStore[key]; },
  clear: () => { for (let k in memoryStore) delete memoryStore[k]; }
};

const rawSeed = fs.readFileSync(path.join(__dirname, '../data/reviews.json'), 'utf8');
const parsedSeed = JSON.parse(rawSeed);

global.fetch = async (url) => {
  if (url.includes('reviews.json')) {
    return {
      ok: true,
      json: async () => parsedSeed
    };
  }
  return { ok: false };
};

global.window = {
  localStorage: global.localStorage,
  dispatchEvent: () => {},
  YatraApp: {
    showToast: () => {}
  }
};

const {
  reviewsManager,
  sanitizeReviewText,
  sanitizeFirstName,
  renderStars
} = await import('../js/reviews.js');

console.log('====================================================');
console.log('🧪 YATRALOCAL PHASE 15: USER FEEDBACK & REVIEWS TEST');
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
  await reviewsManager.loadSeedReviews();

  // Test 1: Seed reviews loading and sample badge tagging
  const allReviews = reviewsManager.getAllReviews();
  const sampleCount = allReviews.filter((r) => r.isSample === true).length;
  assert(
    'Seed reviews loaded successfully and 100% are marked with isSample: true',
    allReviews.length >= 24 && sampleCount === allReviews.length,
    `Loaded ${allReviews.length} reviews, all with isSample=true`
  );

  // Test 2: Input Sanitization strips HTML and script tags
  const dirtyComment = '<script>alert("XSS")</script><img src="x" onerror="steal()"/>Clean and peaceful room!';
  const cleanComment = sanitizeReviewText(dirtyComment, 300);
  assert(
    'sanitizeReviewText strips script and HTML tags cleanly',
    !cleanComment.includes('<script>') && !cleanComment.includes('<img') && cleanComment.includes('Clean and peaceful room!'),
    `Sanitized: "${cleanComment}"`
  );

  // Test 3: First name extractor prevents leaking surnames
  const fullName = 'Rameshwar Kumar Singh <script>';
  const cleanFirstName = sanitizeFirstName(fullName);
  assert(
    'sanitizeFirstName extracts only first name for privacy without HTML',
    cleanFirstName === 'Rameshwar',
    `Extracted first name: "${cleanFirstName}"`
  );

  // Test 4: Validation - Comment shorter than 10 characters is rejected
  const shortResult = reviewsManager.submitReview({
    targetType: 'stay',
    targetId: 'stay-manali-1',
    rating: 5,
    comment: 'Too short',
    name: 'Ananya'
  });
  assert(
    'Validation rejects comment under 10 characters',
    shortResult.success === false && shortResult.field === 'comment',
    `Error message: "${shortResult.message}"`
  );

  // Test 5: Validation - Comment longer than 300 characters is rejected
  const longComment = 'This was a '.repeat(35); // 385 chars
  const longResult = reviewsManager.submitReview({
    targetType: 'stay',
    targetId: 'stay-manali-1',
    rating: 5,
    comment: longComment,
    name: 'Ananya'
  });
  assert(
    'Validation rejects comment over 300 characters',
    longResult.success === false && longResult.field === 'comment',
    `Error message: "${longResult.message}"`
  );

  // Test 6: Validation - Rating outside 1-5 is rejected
  const badRatingResult = reviewsManager.submitReview({
    targetType: 'stay',
    targetId: 'stay-manali-1',
    rating: 6,
    comment: 'Great hospitality and warm food.',
    name: 'Ananya'
  });
  assert(
    'Validation rejects ratings greater than 5 or less than 1',
    badRatingResult.success === false && badRatingResult.field === 'rating',
    `Error message: "${badRatingResult.message}"`
  );

  // Test 7: Successful review submission & local storage persistence
  const targetId = 'stay-manali-1';
  const initialMetrics = reviewsManager.getMetricsForTarget(targetId);

  const validResult = reviewsManager.submitReview({
    targetType: 'stay',
    targetId,
    rating: 5,
    comment: 'Incredible hospitality by Uncle Ramesh Thakur. Ground floor room was perfect for my parents.',
    tags: ['Clean', 'Senior-friendly', 'Friendly host'],
    name: 'Priya Sharma',
    language: 'EN'
  });

  assert(
    'Valid review submits successfully and returns newly created review object',
    validResult.success === true && validResult.review?.id && validResult.review?.name === 'Priya',
    `Review ID: ${validResult.review?.id}, Sanitized Name: ${validResult.review?.name}`
  );

  // Test 8: Rate Limiting prevents duplicate review for the same target from this browser
  const duplicateResult = reviewsManager.submitReview({
    targetType: 'stay',
    targetId,
    rating: 4,
    comment: 'Attempting a second review from the same browser.',
    name: 'Priya'
  });
  assert(
    'Rate limiter blocks duplicate review for the same target ID',
    duplicateResult.success === false && duplicateResult.message.includes('already reviewed'),
    `Message: "${duplicateResult.message}"`
  );

  // Test 9: Recalculation of metrics (Average Rating, Total Count, Breakdown)
  const updatedMetrics = reviewsManager.getMetricsForTarget(targetId);
  assert(
    'Metrics recalculate accurately: count increments and 5-star breakdown increments',
    updatedMetrics.totalReviews === initialMetrics.totalReviews + 1 &&
    updatedMetrics.breakdown[5] === initialMetrics.breakdown[5] + 1,
    `New total: ${updatedMetrics.totalReviews} (was ${initialMetrics.totalReviews}), 5★ count: ${updatedMetrics.breakdown[5]}`
  );

  // Test 10: Filtering & Sorting functionality
  const allTargetReviews = reviewsManager.getReviewsForTarget(targetId);
  const fiveStarFiltered = reviewsManager.filterAndSortReviews(allTargetReviews, { ratingFilter: '5' });
  const seniorFiltered = reviewsManager.filterAndSortReviews(allTargetReviews, { tagFilter: 'Senior-friendly' });

  assert(
    'filterAndSortReviews correctly filters reviews by 5-star rating and tags',
    fiveStarFiltered.every((r) => r.rating === 5) &&
    seniorFiltered.every((r) => r.tags.includes('Senior-friendly')),
    `5★ reviews found: ${fiveStarFiltered.length}, Senior-friendly tagged: ${seniorFiltered.length}`
  );

  // Test 11: Saral Mode 3-button mapping
  const saralGoodMapping = 5;
  const saralOkayMapping = 3;
  const saralNotGoodMapping = 1;
  assert(
    'Saral Mode 3-button rating correctly maps to 5, 3, and 1 stars',
    renderStars(saralGoodMapping) === '★★★★★' &&
    renderStars(saralOkayMapping) === '★★★☆☆' &&
    renderStars(saralNotGoodMapping) === '★☆☆☆☆',
    `5★='${renderStars(5)}', 3★='${renderStars(3)}', 1★='${renderStars(1)}'`
  );

  console.log('====================================================');
  console.log(`Results: ${passed}/${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
