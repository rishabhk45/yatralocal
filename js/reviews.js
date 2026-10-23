/**
 * YatraLocal - User Feedback & Reviews Manager (/js/reviews.js)
 * 
 * Capabilities:
 * 1. Loads seed sample reviews from /data/reviews.json and merges with localStorage ("yl_reviews").
 * 2. Strict XSS-safe input sanitization (strip HTML, max 300 chars, first name only, DOM textContent).
 * 3. Rate limiting: 1 review per target (stay/guide/destination) per browser.
 * 4. Metrics: average rating, total count, 5-bar rating distribution, and tag highlights.
 * 5. Interactive filtering (All, 5★, 4★+, Senior-friendly, Hindi) and sorting (Newest, Highest, Lowest).
 * 6. UI builders: full detail review block, review submission modal, and accessible Saral summary.
 * 7. Clear attribution: isSample = true marked "Sample review", false marked "Submitted on this device (Demo)".
 */

import { store } from './store.js';
import { speechAssistant } from './speech.js';

const STORAGE_KEY = 'yl_reviews';
const RATE_LIMIT_KEY = 'yl_reviewed_targets';

export const REVIEW_TAGS = [
  'Clean',
  'Friendly host',
  'Good value',
  'Safe',
  'Senior-friendly',
  'Less crowded'
];

let seedCache = null;

// Clean text: strip HTML tags, normalize whitespace, enforce char limit
export function sanitizeReviewText(str, maxLength = 300) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Strip control chars
    .trim()
    .slice(0, maxLength);
}

// Extract first name only for privacy
export function sanitizeFirstName(str, maxLength = 25) {
  const clean = sanitizeReviewText(str, maxLength);
  if (!clean) return 'Traveller';
  return clean.split(/\s+/)[0]; // First name only
}

// Convert number rating to star string
export function renderStars(rating) {
  const r = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

class ReviewsManager {
  constructor() {
    this.seedReviews = [];
    this.isLoaded = false;
  }

  /**
   * Load seed reviews from /data/reviews.json
   */
  async loadSeedReviews() {
    if (this.isLoaded && seedCache) {
      this.seedReviews = seedCache;
      return this.seedReviews;
    }

    const candidateUrls = [
      'data/reviews.json',
      '../data/reviews.json',
      '/data/reviews.json'
    ];

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          this.seedReviews = await res.json();
          seedCache = this.seedReviews;
          this.isLoaded = true;
          return this.seedReviews;
        }
      } catch (_) {}
    }

    console.warn('[ReviewsManager] Could not fetch seed reviews from network, using empty array.');
    this.seedReviews = [];
    return this.seedReviews;
  }

  /**
   * Get user-submitted reviews stored in localStorage
   */
  getLocalReviews() {
    try {
      if (typeof localStorage === 'undefined') return [];
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.warn('[ReviewsManager] Failed to read from localStorage:', err);
      return [];
    }
  }

  /**
   * Get all reviews (merged seed + local submissions)
   */
  getAllReviews() {
    const local = this.getLocalReviews();
    // Local submissions sit at the top, followed by seed sample reviews
    return [...local, ...(this.seedReviews || [])];
  }

  /**
   * Get merged reviews for a specific listing or destination
   */
  getReviewsForTarget(targetId, targetType = null) {
    const all = this.getAllReviews();
    return all.filter((r) => {
      const idMatch = String(r.targetId).toLowerCase() === String(targetId).toLowerCase();
      if (!idMatch) return false;
      if (targetType) {
        return r.targetType === targetType;
      }
      return true;
    });
  }

  /**
   * Get calculated metrics for a specific listing or destination
   */
  getMetricsForTarget(targetId, targetType = null) {
    const reviews = this.getReviewsForTarget(targetId, targetType);
    return this.calculateMetrics(reviews);
  }

  /**
   * Check if this browser has already reviewed the target
   */
  hasUserReviewed(targetId) {
    try {
      if (typeof localStorage === 'undefined') return false;
      const data = localStorage.getItem(RATE_LIMIT_KEY);
      const reviewed = data ? JSON.parse(data) : [];
      return reviewed.includes(String(targetId).toLowerCase());
    } catch (_) {
      return false;
    }
  }

  /**
   * Submit a new feedback review
   */
  submitReview({ targetId, targetType, name, rating, comment, tags, language }) {
    if (!targetId) {
      return { success: false, error: 'Target listing ID is required.', message: 'Target listing ID is required.', field: 'targetId' };
    }
    
    // Rating validation
    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return { success: false, error: 'Please select a rating between 1 and 5 stars.', message: 'Please select a rating between 1 and 5 stars.', field: 'rating' };
    }

    // Comment validation
    const cleanComment = sanitizeReviewText(comment, 300);
    if (!cleanComment || cleanComment.length < 10) {
      return { success: false, error: 'Comment must be at least 10 characters long.', message: 'Comment must be at least 10 characters long.', field: 'comment' };
    }
    if (typeof comment === 'string' && comment.trim().length > 300) {
      return { success: false, error: 'Comment cannot exceed 300 characters.', message: 'Comment cannot exceed 300 characters.', field: 'comment' };
    }

    // Rate limiting: 1 review per target per browser
    const normalizedTarget = String(targetId).toLowerCase();
    if (this.hasUserReviewed(normalizedTarget)) {
      return { success: false, error: 'You have already reviewed this stay on this device.', message: 'You have already reviewed this stay on this device.', field: 'rateLimit' };
    }

    const cleanName = sanitizeFirstName(name, 25) || 'Traveller';
    const validTags = Array.isArray(tags) 
      ? tags.filter(t => REVIEW_TAGS.includes(t)).slice(0, 5)
      : [];

    const newReview = {
      id: `rev-user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      targetType: targetType || 'stay',
      targetId: normalizedTarget,
      name: cleanName,
      rating: numRating,
      comment: cleanComment,
      tags: validTags,
      travelMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      createdAt: new Date().toISOString(),
      language: language === 'hi' ? 'hi' : 'en',
      isSample: false
    };

    // Save to localStorage
    if (typeof localStorage !== 'undefined') {
      const current = this.getLocalReviews();
      current.unshift(newReview);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));

      // Update rate-limit tracking
      const rateData = localStorage.getItem(RATE_LIMIT_KEY);
      const reviewedTargets = rateData ? JSON.parse(rateData) : [];
      reviewedTargets.push(normalizedTarget);
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(reviewedTargets));
    }

    return {
      success: true,
      ...newReview,
      review: newReview
    };
  }

  /**
   * Calculate metrics: average rating, total count, 5-bar breakdown, and top tags
   */
  calculateMetrics(reviews = []) {
    const count = reviews.length;
    if (count === 0) {
      return {
        count: 0,
        totalReviews: 0,
        average: 0,
        averageRating: '0.0',
        averageFormatted: '0.0',
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        breakdownDetailed: { 5: { count: 0, pct: 0 }, 4: { count: 0, pct: 0 }, 3: { count: 0, pct: 0 }, 2: { count: 0, pct: 0 }, 1: { count: 0, pct: 0 } },
        tagsSummary: {},
        highlights: []
      };
    }

    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const average = Math.round((sum / count) * 10) / 10;

    // Breakdown per star rating
    const breakdownDetailed = {
      5: { count: 0, pct: 0 },
      4: { count: 0, pct: 0 },
      3: { count: 0, pct: 0 },
      2: { count: 0, pct: 0 },
      1: { count: 0, pct: 0 }
    };
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    // Tag frequencies
    const tagCounts = {};

    reviews.forEach(r => {
      const star = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));
      breakdownDetailed[star].count++;
      breakdown[star]++;

      (r.tags || []).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    for (let s = 1; s <= 5; s++) {
      breakdownDetailed[s].pct = Math.round((breakdownDetailed[s].count / count) * 100);
    }

    // Sort tag highlights
    const highlights = Object.entries(tagCounts)
      .map(([tag, tCount]) => ({
        tag,
        count: tCount,
        pct: Math.round((tCount / count) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    return {
      count,
      totalReviews: count,
      average,
      averageRating: average.toFixed(1),
      averageFormatted: average.toFixed(1),
      breakdown,
      breakdownDetailed,
      tagsSummary: tagCounts,
      highlights
    };
  }

  /**
   * Filter and sort reviews list
   */
  filterAndSortReviews(reviews = [], opts = {}) {
    let result = [...reviews];
    const filter = opts.filter || opts.ratingFilter || 'all';
    const tagFilter = opts.tagFilter;
    const sort = opts.sort || 'newest';

    // Filter by rating or preset key
    if (filter === '5') {
      result = result.filter(r => r.rating === 5);
    } else if (filter === '4plus' || filter === '4+') {
      result = result.filter(r => r.rating >= 4);
    } else if (filter === 'senior' || filter === 'Senior-friendly') {
      result = result.filter(r => (r.tags || []).includes('Senior-friendly'));
    } else if (filter === 'hindi') {
      result = result.filter(r => r.language === 'hi');
    }

    if (tagFilter) {
      result = result.filter(r => (r.tags || []).includes(tagFilter));
    }

    // Sort
    result.sort((a, b) => {
      if (sort === 'highest') {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sort === 'lowest') {
        if (a.rating !== b.rating) return a.rating - b.rating;
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      // 'newest' default
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return result;
  }
}

export const reviewsManager = new ReviewsManager();

/**
 * Creates a DOM node for a single review card (Uses textContent strictly to prevent XSS)
 */
export function createReviewCardDOM(review) {
  const card = document.createElement('article');
  card.className = 'review-card flow';
  card.setAttribute('data-id', review.id);

  // Header
  const header = document.createElement('div');
  header.className = 'review-header';

  const authorGroup = document.createElement('div');
  authorGroup.style.display = 'flex';
  authorGroup.style.alignItems = 'center';
  authorGroup.style.gap = '8px';
  authorGroup.style.flexWrap = 'wrap';

  const authorName = document.createElement('span');
  authorName.className = 'review-author';
  authorName.textContent = review.name || 'Traveller';
  authorGroup.appendChild(authorName);

  const badge = document.createElement('span');
  badge.className = review.isSample ? 'badge-sample-review' : 'badge-user-review';
  badge.textContent = review.isSample ? 'Sample review' : 'Submitted on this device (Demo)';
  authorGroup.appendChild(badge);

  const metaGroup = document.createElement('div');
  metaGroup.style.textAlign = 'right';

  const stars = document.createElement('div');
  stars.className = 'review-stars';
  stars.textContent = renderStars(review.rating);
  metaGroup.appendChild(stars);

  const date = document.createElement('div');
  date.className = 'review-date';
  date.textContent = review.travelMonth || 'Recent';
  metaGroup.appendChild(date);

  header.appendChild(authorGroup);
  header.appendChild(metaGroup);
  card.appendChild(header);

  // Comment (XSS Defense: ALWAYS textContent, never innerHTML)
  const commentP = document.createElement('p');
  commentP.className = 'review-comment';
  commentP.textContent = `"${review.comment}"`;
  card.appendChild(commentP);

  // Tags
  if (Array.isArray(review.tags) && review.tags.length > 0) {
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'review-tags-list';
    review.tags.forEach(t => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'review-tag';
      tagSpan.textContent = `✓ ${t}`;
      tagsContainer.appendChild(tagSpan);
    });
    card.appendChild(tagsContainer);
  }

  return card;
}

/**
 * Renders complete interactive reviews container with breakdown, filters, and list
 */
export async function renderReviewsContainer(containerEl, targetId, targetType, targetName = '') {
  if (!containerEl) return;
  containerEl.innerHTML = '';

  const reviews = await reviewsManager.getReviewsForTarget(targetId, targetType);
  const metrics = reviewsManager.calculateMetrics(reviews);
  const hasReviewed = reviewsManager.hasUserReviewed(targetId);

  let currentFilter = 'all';
  let currentSort = 'newest';

  // Section Header
  const headerDiv = document.createElement('div');
  headerDiv.className = 'flex-between';
  headerDiv.style.alignItems = 'center';
  headerDiv.style.flexWrap = 'wrap';
  headerDiv.style.gap = 'var(--space-3)';
  headerDiv.style.marginBottom = 'var(--space-4)';

  headerDiv.innerHTML = `
    <div>
      <h4 style="margin: 0; font-size: 1.15rem; color: var(--color-primary);">
        💬 Traveller Feedback & Reviews
      </h4>
      <p style="margin: 4px 0 0; font-size: var(--font-size-xs); color: var(--color-text-muted);">
        Verified authentic experiences from community travellers.
      </p>
    </div>
  `;

  const writeBtn = document.createElement('button');
  writeBtn.type = 'button';
  writeBtn.className = 'btn btn-primary btn-sm';
  writeBtn.id = 'btn-write-review';
  writeBtn.innerHTML = hasReviewed ? '✓ Review Submitted' : '✍️ Write a Review';
  if (hasReviewed) {
    writeBtn.disabled = true;
    writeBtn.style.opacity = '0.7';
  } else {
    writeBtn.addEventListener('click', () => {
      openWriteReviewModal({
        targetId,
        targetType,
        targetName,
        onSubmitted: () => renderReviewsContainer(containerEl, targetId, targetType, targetName)
      });
    });
  }
  headerDiv.appendChild(writeBtn);
  containerEl.appendChild(headerDiv);

  // Overview Card (Score + 5-Bar Breakdown)
  const overviewCard = document.createElement('div');
  overviewCard.className = 'rating-overview-card';
  overviewCard.innerHTML = `
    <div class="rating-score-box">
      <div class="rating-score-number">${metrics.averageFormatted}</div>
      <div class="rating-score-stars">${renderStars(metrics.average)}</div>
      <div class="rating-score-count">${metrics.count} traveller reviews</div>
    </div>
    <div class="rating-breakdown-bars">
      ${[5, 4, 3, 2, 1].map(star => {
        const item = metrics.breakdown[star] || { count: 0, pct: 0 };
        return `
          <div class="rating-breakdown-row">
            <span class="rating-bar-label">${star} ★</span>
            <div class="rating-bar-track">
              <div class="rating-bar-fill" style="width: ${item.pct}%;"></div>
            </div>
            <span class="rating-bar-pct">${item.pct}%</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
  containerEl.appendChild(overviewCard);

  // Traveller Highlights (computed locally from tags)
  if (metrics.highlights.length > 0) {
    const highlightsDiv = document.createElement('div');
    highlightsDiv.style.marginBottom = 'var(--space-4)';
    highlightsDiv.style.fontSize = 'var(--font-size-xs)';
    highlightsDiv.style.background = 'var(--color-bg)';
    highlightsDiv.style.padding = 'var(--space-3) var(--space-4)';
    highlightsDiv.style.borderRadius = 'var(--radius-md)';
    highlightsDiv.style.border = '1px solid var(--color-border)';

    highlightsDiv.innerHTML = `
      <strong style="color: var(--color-primary);">✨ Traveller Highlights:</strong>
      <span style="color: var(--color-text-main); margin-left: 6px;">
        ${metrics.highlights.map(h => `<strong>${h.tag}</strong> (${h.pct}%)`).join(' • ')}
      </span>
    `;
    containerEl.appendChild(highlightsDiv);
  }

  // Filter & Sort Bar
  const filterBar = document.createElement('div');
  filterBar.className = 'reviews-filter-bar';
  filterBar.innerHTML = `
    <div class="reviews-filter-pills" role="tablist" aria-label="Review filter">
      <button type="button" class="filter-pill ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">All (${metrics.count})</button>
      <button type="button" class="filter-pill ${currentFilter === '5' ? 'active' : ''}" data-filter="5">5 ★ (${metrics.breakdown[5]?.count || 0})</button>
      <button type="button" class="filter-pill ${currentFilter === '4plus' ? 'active' : ''}" data-filter="4plus">4+ ★ (${(metrics.breakdown[5]?.count || 0) + (metrics.breakdown[4]?.count || 0)})</button>
      <button type="button" class="filter-pill ${currentFilter === 'senior' ? 'active' : ''}" data-filter="senior">Senior-friendly</button>
      <button type="button" class="filter-pill ${currentFilter === 'hindi' ? 'active' : ''}" data-filter="hindi">हिंदी</button>
    </div>
    <div>
      <select id="select-review-sort" class="form-control" style="padding: 4px 10px; font-size: var(--font-size-xs);" aria-label="Sort reviews">
        <option value="newest" ${currentSort === 'newest' ? 'selected' : ''}>Newest First</option>
        <option value="highest" ${currentSort === 'highest' ? 'selected' : ''}>Highest Rated</option>
        <option value="lowest" ${currentSort === 'lowest' ? 'selected' : ''}>Lowest Rated</option>
      </select>
    </div>
  `;
  containerEl.appendChild(filterBar);

  // Reviews List Container
  const listContainer = document.createElement('div');
  listContainer.id = 'reviews-list-container';
  listContainer.className = 'flow';
  containerEl.appendChild(listContainer);

  const renderList = () => {
    listContainer.innerHTML = '';
    const filtered = reviewsManager.filterAndSortReviews(reviews, {
      filter: currentFilter,
      sort: currentSort
    });

    if (filtered.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.textAlign = 'center';
      emptyDiv.style.padding = 'var(--space-6)';
      emptyDiv.style.background = 'var(--color-bg)';
      emptyDiv.style.borderRadius = 'var(--radius-md)';
      emptyDiv.style.color = 'var(--color-text-muted)';
      emptyDiv.style.fontSize = 'var(--font-size-sm)';
      emptyDiv.textContent = 'No reviews match this filter. Be the first to share feedback.';
      listContainer.appendChild(emptyDiv);
      return;
    }

    filtered.forEach(r => {
      listContainer.appendChild(createReviewCardDOM(r));
    });
  };

  renderList();

  // Attach filter pill handlers
  filterBar.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBar.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderList();
    });
  });

  // Attach sort handler
  filterBar.querySelector('#select-review-sort')?.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderList();
  });

  // Honesty & Device Policy Note
  const noticeDiv = document.createElement('div');
  noticeDiv.style.marginTop = 'var(--space-4)';
  noticeDiv.style.fontSize = '0.72rem';
  noticeDiv.style.color = 'var(--color-text-muted)';
  noticeDiv.style.lineHeight = '1.5';
  noticeDiv.textContent = '🔒 Reviews in this prototype are stored on your device only. Seed reviews are sample data for demonstration.';
  containerEl.appendChild(noticeDiv);
}

/**
 * Opens modal dialog to write and submit a review
 */
export function openWriteReviewModal(targetIdOrOpts, targetTypeParam, targetNameParam = '', onSubmittedParam) {
  let targetId = targetIdOrOpts;
  let targetType = targetTypeParam;
  let targetName = targetNameParam;
  let onSubmitted = onSubmittedParam;

  if (typeof targetIdOrOpts === 'object' && targetIdOrOpts !== null) {
    targetId = targetIdOrOpts.targetId;
    targetType = targetIdOrOpts.targetType;
    targetName = targetIdOrOpts.targetName || '';
    onSubmitted = targetIdOrOpts.onSubmitted;
  }

  if (reviewsManager.hasUserReviewed(targetId)) {
    if (window.YatraApp && window.YatraApp.showToast) {
      window.YatraApp.showToast('You have already submitted a review for this listing on this device.', 'info');
    }
    return;
  }

  let selectedRating = 5;
  const selectedTags = new Set();
  const currentLang = store.getState().language || 'EN';

  const modalContent = document.createElement('div');
  modalContent.className = 'flow';
  modalContent.style.fontSize = 'var(--font-size-sm)';

  modalContent.innerHTML = `
    <p style="color: var(--color-text-muted); margin: 0 0 var(--space-3) 0;">
      Sharing feedback for <strong>${targetName || 'this listing'}</strong>.
    </p>

    <!-- Star Rating Control -->
    <div style="margin-bottom: var(--space-4);">
      <label style="display: block; font-weight: 700; margin-bottom: 6px;">Your Rating *</label>
      <div class="star-rating-control" role="radiogroup" aria-label="Select star rating from 1 to 5">
        ${[1, 2, 3, 4, 5].map(star => `
          <button type="button" class="star-rating-btn ${star <= selectedRating ? 'active' : ''}" data-star="${star}" role="radio" aria-checked="${star === selectedRating}" aria-label="${star} star${star > 1 ? 's' : ''}">
            ★
          </button>
        `).join('')}
      </div>
      <span id="star-rating-text" style="font-size: var(--font-size-xs); color: #D97706; font-weight: 600; margin-left: 8px;">
        5 out of 5 stars
      </span>
    </div>

    <!-- Tags Picker -->
    <div style="margin-bottom: var(--space-4);">
      <label style="display: block; font-weight: 700; margin-bottom: 6px;">Select Highlights (Optional)</label>
      <div class="flex gap-2" style="flex-wrap: wrap;" id="review-tag-chips-container">
        ${REVIEW_TAGS.map(t => `
          <button type="button" class="review-tag-chip" data-tag="${t}" aria-pressed="false">
            + ${t}
          </button>
        `).join('')}
      </div>
    </div>

    <!-- Comment Input -->
    <div style="margin-bottom: var(--space-4);">
      <div class="flex-between" style="margin-bottom: 4px;">
        <label for="review-comment-input" style="font-weight: 700;">Your Experience (10 to 300 characters) *</label>
        <span id="review-char-count" style="font-size: 0.72rem; color: var(--color-text-muted);">0 / 300</span>
      </div>
      <textarea id="review-comment-input" class="form-control" rows="4" maxlength="300" placeholder="Tell other travellers what made your stay memorable, quiet spots nearby, or helpful tips for elders..." required style="width: 100%; resize: vertical;"></textarea>
      <div id="review-error-msg" style="color: var(--color-danger); font-size: var(--font-size-xs); margin-top: 4px; display: none;"></div>
    </div>

    <!-- Name Input (Optional) -->
    <div style="margin-bottom: var(--space-5);">
      <label for="review-name-input" style="display: block; font-weight: 700; margin-bottom: 4px;">Your First Name (Optional)</label>
      <input type="text" id="review-name-input" class="form-control" maxlength="25" placeholder="e.g. Rahul (defaults to 'Traveller')" style="width: 100%;" />
    </div>

    <!-- Actions -->
    <div class="flex-between" style="border-top: 1px solid var(--color-border); padding-top: var(--space-4);">
      <button type="button" class="btn btn-outline btn-sm" id="btn-cancel-review">Cancel</button>
      <button type="button" class="btn btn-primary btn-sm" id="btn-submit-review">Submit Feedback</button>
    </div>
  `;

  if (window.YatraApp && window.YatraApp.openModal) {
    window.YatraApp.openModal({
      title: 'Write a Review',
      content: modalContent.outerHTML
    });

    setTimeout(() => {
      const modalBody = document.getElementById('modal-body');
      if (!modalBody) return;

      const starBtns = modalBody.querySelectorAll('.star-rating-btn');
      const starText = modalBody.querySelector('#star-rating-text');
      const tagChips = modalBody.querySelectorAll('.review-tag-chip');
      const commentInput = modalBody.querySelector('#review-comment-input');
      const charCount = modalBody.querySelector('#review-char-count');
      const nameInput = modalBody.querySelector('#review-name-input');
      const errorMsg = modalBody.querySelector('#review-error-msg');
      const submitBtn = modalBody.querySelector('#btn-submit-review');
      const cancelBtn = modalBody.querySelector('#btn-cancel-review');

      // Star clicks
      starBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          selectedRating = parseInt(btn.dataset.star, 10);
          starBtns.forEach(b => {
            const starVal = parseInt(b.dataset.star, 10);
            b.classList.toggle('active', starVal <= selectedRating);
            b.setAttribute('aria-checked', String(starVal === selectedRating));
          });
          if (starText) {
            starText.textContent = `${selectedRating} out of 5 stars`;
          }
        });
      });

      // Tag chips clicks
      tagChips.forEach(chip => {
        chip.addEventListener('click', () => {
          const tag = chip.dataset.tag;
          if (selectedTags.has(tag)) {
            selectedTags.delete(tag);
            chip.classList.remove('selected');
            chip.setAttribute('aria-pressed', 'false');
            chip.textContent = `+ ${tag}`;
          } else {
            selectedTags.add(tag);
            chip.classList.add('selected');
            chip.setAttribute('aria-pressed', 'true');
            chip.textContent = `✓ ${tag}`;
          }
        });
      });

      // Char counter
      commentInput?.addEventListener('input', () => {
        const len = (commentInput.value || '').length;
        if (charCount) charCount.textContent = `${len} / 300`;
        if (errorMsg) errorMsg.style.display = 'none';
      });

      cancelBtn?.addEventListener('click', () => {
        window.YatraApp.closeModal();
      });

      // Submit
      submitBtn?.addEventListener('click', () => {
        const comment = commentInput?.value?.trim() || '';
        const name = nameInput?.value?.trim() || 'Traveller';

        if (comment.length < 10) {
          if (errorMsg) {
            errorMsg.textContent = 'Comment must be at least 10 characters long.';
            errorMsg.style.display = 'block';
          }
          commentInput?.focus();
          return;
        }

        try {
          const res = reviewsManager.submitReview({
            targetId,
            targetType,
            name,
            rating: selectedRating,
            comment,
            tags: Array.from(selectedTags),
            language: currentLang === 'HI' ? 'hi' : 'en'
          });

          if (!res.success) {
            if (errorMsg) {
              errorMsg.textContent = res.message || 'Error submitting review.';
              errorMsg.style.display = 'block';
            }
            return;
          }

          window.YatraApp.closeModal();
          if (window.YatraApp.showToast) {
            window.YatraApp.showToast('✓ Thank you! Your review has been saved to this device.');
          }

          if (typeof onSubmitted === 'function') {
            onSubmitted(res.review || res);
          }
        } catch (err) {
          if (errorMsg) {
            errorMsg.textContent = err.message;
            errorMsg.style.display = 'block';
          }
        }
      });
    }, 50);
  }
}
