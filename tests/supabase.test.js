/**
 * YatraLocal - Supabase Auth & Shared Reviews Test Suite (Phase 17)
 */

import { getSupabase } from '../js/supabase.js';
import { logIn, signUp, logOut, getCurrentUser } from '../js/auth.js';
import { reviewsManager, sanitizeReviewText, sanitizeFirstName } from '../js/reviews.js';

let totalTests = 0;
let passedTests = 0;

function assert(description, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${description}`);
    if (details) console.log(`       └─ ${details}`);
  } else {
    console.error(`[FAIL] ${description}`);
    if (details) console.error(`       └─ ${details}`);
  }
}

// Mock localStorage for Node environment if missing
if (typeof localStorage === 'undefined') {
  const memStore = {};
  global.localStorage = {
    getItem: (k) => memStore[k] || null,
    setItem: (k, v) => { memStore[k] = String(v); },
    removeItem: (k) => { delete memStore[k]; },
    clear: () => { Object.keys(memStore).forEach(k => delete memStore[k]); }
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 YATRALOCAL PHASE 17: SUPABASE AUTH & SHARED REVIEWS');
  console.log('====================================================');

  // Test 1: Supabase client initialization
  const supabase = await getSupabase();
  assert(
    'Supabase client initializes with auth and table query interface',
    supabase && typeof supabase.auth === 'object' && typeof supabase.from === 'function',
    `Client initialized (Fallback mode: ${Boolean(supabase._isFallback)})`
  );

  // Test 2: Unauthenticated review submission is blocked
  await logOut();
  const unauthAttempt = await reviewsManager.submitReview({
    targetId: 'osm:node:harsil',
    targetType: 'place',
    rating: 5,
    comment: 'Wonderful peaceful village with warm tea stalls.'
  });

  assert(
    'Unauthenticated users are blocked from writing reviews and prompted to log in',
    unauthAttempt.success === false && unauthAttempt.requireLogin === true,
    `Response: requireLogin=${unauthAttempt.requireLogin}, message="${unauthAttempt.message}"`
  );

  // Test 3: Sign Up new traveller account
  const testEmail = 'traveller_' + Date.now() + '@yatralocal.org';
  const signupRes = await signUp(testEmail, 'SecretPass123', 'Aarav');
  const loggedInUser = getCurrentUser();

  assert(
    'User signup creates session and populates authenticated user in store',
    loggedInUser && loggedInUser.email === testEmail && loggedInUser.name === 'Aarav',
    `Logged in as: ${loggedInUser?.name} (${loggedInUser?.email}) [ID: ${loggedInUser?.id}]`
  );

  // Test 4: Authenticated review submission
  const reviewRes = await reviewsManager.submitReview({
    targetId: 'osm:node:harsil',
    targetName: 'Harsil Valley',
    targetType: 'place',
    rating: 5,
    comment: 'Untouched apple orchards, roaring Bhagirathi river, and warm local hosts.',
    tags: ['Clean', 'Safe', 'Less crowded']
  });

  assert(
    'Authenticated user successfully publishes review with verified account flag',
    reviewRes.success === true && reviewRes.review &&
    reviewRes.review.rating === 5 && reviewRes.review.isVerifiedAccount === true,
    `Review published by "${reviewRes.review?.author_name || reviewRes.review?.name}" (ID: ${reviewRes.review?.id})`
  );

  // Test 5: Duplicate review prevention (unique user + place constraint)
  const duplicateRes = await reviewsManager.submitReview({
    targetId: 'osm:node:harsil',
    targetType: 'place',
    rating: 4,
    comment: 'Second review attempt should be rejected.'
  });

  assert(
    'Duplicate review by same user on same place is prevented',
    duplicateRes.success === false && (duplicateRes.error.includes('already') || duplicateRes.message.includes('already')),
    `Duplicate rejection: "${duplicateRes.message || duplicateRes.error}"`
  );

  // Test 6: Reading reviews without login
  await logOut();
  const fetchedReviews = await reviewsManager.getReviewsForTarget('osm:node:harsil', 'place');
  assert(
    'Unauthenticated visitors can read all community reviews',
    Array.isArray(fetchedReviews) && fetchedReviews.length > 0,
    `Loaded ${fetchedReviews.length} community reviews for Harsil`
  );

  // Test 7: XSS Sanitization in review comments
  const dirtyComment = '<script>alert("hack")</script>Peaceful <b>Ghats</b> and temples!';
  const cleanComment = sanitizeReviewText(dirtyComment);
  assert(
    'sanitizeReviewText removes script tags and HTML markup',
    !cleanComment.includes('<script>') && !cleanComment.includes('<b>') && cleanComment.includes('Peaceful'),
    `Clean text: "${cleanComment}"`
  );

  // Test 8: First name privacy sanitization
  const fullName = 'Vikramaditya Singhania';
  const firstNameOnly = sanitizeFirstName(fullName);
  assert(
    'sanitizeFirstName extracts only first name to protect user privacy',
    firstNameOnly === 'Vikramaditya',
    `Extracted: "${firstNameOnly}" from "${fullName}"`
  );

  // Test 9: User Log In
  await logIn(testEmail, 'SecretPass123');
  const reloggedUser = getCurrentUser();
  assert(
    'User can log back into account with credentials',
    reloggedUser && reloggedUser.email === testEmail,
    `Re-authenticated user: ${reloggedUser?.email}`
  );

  // Test 10: Author can delete their own review
  if (reviewRes.review && reviewRes.review.id) {
    const delRes = await reviewsManager.deleteReview(reviewRes.review.id, 'osm:node:harsil');
    assert(
      'Author can successfully delete their own review',
      delRes.success === true,
      `Deleted review ID: ${reviewRes.review.id}`
    );
  }

  console.log('====================================================');
  console.log(`Results: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('====================================================');

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
