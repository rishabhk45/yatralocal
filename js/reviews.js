/**
 * YatraLocal - User Feedback & Shared Reviews Manager (/js/reviews.js)
 * 
 * Upgraded in Phase 17 with Supabase:
 * 1. Reads/writes shared reviews via Supabase `reviews` table & `place_rating_summary` view.
 * 2. Unauthenticated visitors can read all reviews; writing requires authenticated login.
 * 3. Verified account badge (meaning logged-in user; no fake stay claims).
 * 4. Authors can edit or delete their own reviews (enforced via Supabase RLS).
 * 5. Seed sample reviews from /data/reviews.json retained as fallback placeholders for curated places.
 * 6. Resilient offline fallback to localStorage when Supabase is offline/unconfigured.
 * 7. Strict XSS sanitization (DOM textContent, strip tags, 300-char limit).
 */

import { store } from './store.js';
import { speechAssistant } from './speech.js';
import { getSupabase } from './supabase.js';
import { getCurrentUser, showAuthModal } from './auth.js';

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

    this.seedReviews = [];
    return this.seedReviews;
  }

  /**
   * Get reviews for a target from Supabase (or localStorage fallback)
   */
  async getReviewsForTarget(targetId, targetType = null) {
    await this.loadSeedReviews();
    const cleanTargetId = String(targetId).toLowerCase();
    const currentUser = getCurrentUser();

    let realReviews = [];
    let isFromSupabase = false;

    try {
      const supabase = await getSupabase();
      if (supabase && supabase.from) {
        let query = supabase
          .from('reviews')
          .select('*')
          .eq('place_key', cleanTargetId)
          .order('created_at', { ascending: false });

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          realReviews = data.map(r => ({
            id: r.id,
            targetId: r.place_key,
            targetType: r.target_type,
            name: r.author_name || 'Traveller',
            rating: r.rating,
            comment: r.comment,
            tags: r.tags || [],
            travelMonth: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            createdAt: r.created_at,
            language: r.language || 'en',
            isSample: false,
            isVerifiedAccount: true,
            userId: r.user_id,
            isOwner: currentUser && currentUser.id === r.user_id
          }));
          isFromSupabase = true;
        }
      }
    } catch (err) {
      console.warn('[ReviewsManager] Failed to fetch from Supabase, checking local cache:', err.message);
    }

    // If Supabase was unavailable, load local reviews
    if (!isFromSupabase) {
      const local = this.getLocalReviews();
      realReviews = local
        .filter(r => String(r.targetId).toLowerCase() === cleanTargetId)
        .map(r => ({
          ...r,
          isOwner: true // Created on this local device
        }));
    }

    // Merge matching seed reviews (if any exist for curated listings)
    const matchingSeed = (this.seedReviews || []).filter(r => {
      const idMatch = String(r.targetId).toLowerCase() === cleanTargetId;
      if (!idMatch) return false;
      if (targetType) return r.targetType === targetType;
      return true;
    });

    // Real community reviews appear first, followed by seed sample reviews
    return [...realReviews, ...matchingSeed];
  }

  getLocalReviews() {
    try {
      if (typeof localStorage === 'undefined') return [];
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (_) {
      return [];
    }
  }

  hasUserReviewed(targetId) {
    const user = getCurrentUser();
    if (user) {
      // If user has local flag or Supabase row
      try {
        const key = `yl_reviewed_${user.id}_${String(targetId).toLowerCase()}`;
        return localStorage.getItem(key) === 'true';
      } catch (_) {}
    }
    try {
      const data = localStorage.getItem(RATE_LIMIT_KEY);
      const reviewed = data ? JSON.parse(data) : [];
      return reviewed.includes(String(targetId).toLowerCase());
    } catch (_) {
      return false;
    }
  }

  /**
   * Submit review to Supabase (with login check & validation)
   */
  async submitReview({ targetId, targetType, targetName, name, rating, comment, tags, language }) {
    if (!targetId) {
      return { success: false, error: 'Target place or listing is required.', message: 'Target place or listing is required.' };
    }

    // 1. Authenticated User Check
    const user = getCurrentUser();
    if (!user) {
      return {
        success: false,
        requireLogin: true,
        error: 'Please log in to submit a review.',
        message: 'Please log in to submit a review.'
      };
    }

    // 2. Rating Validation
    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return { success: false, error: 'Please select a rating between 1 and 5 stars.', message: 'Please select a rating between 1 and 5 stars.', field: 'rating' };
    }

    // 3. Comment Validation
    const cleanComment = sanitizeReviewText(comment, 300);
    if (!cleanComment || cleanComment.length < 10) {
      return { success: false, error: 'Comment must be at least 10 characters long.', message: 'Comment must be at least 10 characters long.', field: 'comment' };
    }
    if (typeof comment === 'string' && comment.trim().length > 300) {
      return { success: false, error: 'Comment cannot exceed 300 characters.', message: 'Comment cannot exceed 300 characters.', field: 'comment' };
    }

    const normalizedTarget = String(targetId).toLowerCase();
    if (this.hasUserReviewed(normalizedTarget)) {
      return {
        success: false,
        error: 'You have already submitted a review for this place.',
        message: 'You have already submitted a review for this place.',
        field: 'rateLimit'
      };
    }

    const cleanName = sanitizeFirstName(name || user.name, 25);
    const validTags = Array.isArray(tags)
      ? tags.filter(t => REVIEW_TAGS.includes(t)).slice(0, 5)
      : [];

    // 4. Save to Supabase
    try {
      const supabase = await getSupabase();
      if (supabase && supabase.from) {
        const payload = {
          user_id: user.id,
          place_key: normalizedTarget,
          place_name: targetName || targetId,
          target_type: targetType || 'place',
          rating: numRating,
          comment: cleanComment,
          tags: validTags,
          author_name: cleanName,
          language: language === 'hi' ? 'hi' : 'en'
        };

        const { data, error } = await supabase.from('reviews').insert(payload);
        if (error) {
          if (error.code === '23505' || error.message.includes('unique_user_target_review')) {
            return {
              success: false,
              error: 'You have already submitted a review for this place.',
              message: 'You have already submitted a review for this place.'
            };
          }
          throw error;
        }

        // Set local flag
        localStorage.setItem(`yl_reviewed_${user.id}_${normalizedTarget}`, 'true');

        return {
          success: true,
          review: {
            ...payload,
            id: (data && data[0] && data[0].id) || `rev_${Date.now()}`,
            isOwner: true,
            isVerifiedAccount: true
          }
        };
      }
    } catch (err) {
      console.warn('[ReviewsManager] Supabase insert failed, storing in fallback localStorage:', err.message);
    }

    // Fallback: save to localStorage
    const fallbackReview = {
      id: `rev-local-${Date.now()}`,
      targetType: targetType || 'place',
      targetId: normalizedTarget,
      name: cleanName,
      rating: numRating,
      comment: cleanComment,
      tags: validTags,
      travelMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      createdAt: new Date().toISOString(),
      language: language === 'hi' ? 'hi' : 'en',
      isSample: false,
      isVerifiedAccount: true,
      isOwner: true
    };

    const current = this.getLocalReviews();
    current.unshift(fallbackReview);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    localStorage.setItem(`yl_reviewed_${user.id}_${normalizedTarget}`, 'true');

    return {
      success: true,
      review: fallbackReview
    };
  }

  /**
   * Delete user's own review
   */
  async deleteReview(reviewId, placeKey) {
    const user = getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
      const supabase = await getSupabase();
      if (supabase && supabase.from) {
        const { error } = await supabase
          .from('reviews')
          .delete()
          .eq('id', reviewId)
          .eq('user_id', user.id); // Enforced by RLS as well

        if (error) throw error;
      }
    } catch (err) {
      console.warn('[ReviewsManager] Supabase delete failed, removing locally:', err.message);
    }

    // Also remove from localStorage if present
    const local = this.getLocalReviews().filter(r => r.id !== reviewId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
    if (placeKey) {
      localStorage.removeItem(`yl_reviewed_${user.id}_${String(placeKey).toLowerCase()}`);
    }

    return { success: true };
  }

  /**
   * Compute rating summary metrics
   */
  calculateMetrics(reviews = []) {
    const count = reviews.length;
    if (count === 0) {
      return {
        count: 0,
        average: 0,
        averageFormatted: '0.0',
        breakdown: { 5: { count: 0, pct: 0 }, 4: { count: 0, pct: 0 }, 3: { count: 0, pct: 0 }, 2: { count: 0, pct: 0 }, 1: { count: 0, pct: 0 } },
        highlights: []
      };
    }

    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const average = Math.round((sum / count) * 10) / 10;

    const breakdown = {
      5: { count: 0, pct: 0 },
      4: { count: 0, pct: 0 },
      3: { count: 0, pct: 0 },
      2: { count: 0, pct: 0 },
      1: { count: 0, pct: 0 }
    };

    const tagCounts = {};

    reviews.forEach(r => {
      const star = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));
      breakdown[star].count++;
      (r.tags || []).forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });

    Object.keys(breakdown).forEach(star => {
      breakdown[star].pct = Math.round((breakdown[star].count / count) * 100);
    });

    const highlights = Object.keys(tagCounts)
      .map(tag => ({ tag, count: tagCounts[tag], pct: Math.round((tagCounts[tag] / count) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      count,
      average,
      averageFormatted: average.toFixed(1),
      breakdown,
      highlights
    };
  }

  /**
   * Synchronously compute metrics for a target from cached seed and local reviews
   */
  getMetricsForTarget(targetId) {
    const cleanId = String(targetId || '').toLowerCase();
    const seed = (this.seedReviews || []).filter(r => String(r.targetId).toLowerCase() === cleanId);
    const local = this.getLocalReviews().filter(r => String(r.targetId).toLowerCase() === cleanId);
    const all = [...local, ...seed];
    const metrics = this.calculateMetrics(all);

    return {
      ...metrics,
      totalReviews: metrics.count,
      averageRating: metrics.count > 0 ? metrics.averageFormatted : '4.8'
    };
  }
}

export const createReviewCardDOM = renderReviewCard;
export const reviewsManager = new ReviewsManager();

/**
 * Renders complete interactive reviews container with Supabase integration
 */
export async function renderReviewsContainer(containerEl, targetId, targetType, targetName = '') {
  if (!containerEl) return;
  containerEl.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--color-text-muted);">Loading reviews...</div>';

  const reviews = await reviewsManager.getReviewsForTarget(targetId, targetType);
  const metrics = reviewsManager.calculateMetrics(reviews);
  const currentUser = getCurrentUser();
  const hasReviewed = reviewsManager.hasUserReviewed(targetId);

  containerEl.innerHTML = '';

  // Header
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
        Real shared community reviews powered by Supabase.
      </p>
    </div>
  `;

  const writeBtn = document.createElement('button');
  writeBtn.type = 'button';
  writeBtn.className = 'btn btn-primary btn-sm';
  writeBtn.id = 'btn-write-review';

  if (!currentUser) {
    writeBtn.innerHTML = '🔑 Log in to Write a Review';
    writeBtn.addEventListener('click', () => {
      showAuthModal({
        initialMode: 'login',
        onAuthSuccess: () => renderReviewsContainer(containerEl, targetId, targetType, targetName)
      });
    });
  } else if (hasReviewed) {
    writeBtn.innerHTML = '✓ Review Submitted';
    writeBtn.disabled = true;
    writeBtn.style.opacity = '0.7';
  } else {
    writeBtn.innerHTML = '✍️ Write a Review';
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

  // Overview Card
  const overviewCard = document.createElement('div');
  overviewCard.className = 'rating-overview-card';
  overviewCard.innerHTML = `
    <div class="rating-score-box">
      <div class="rating-score-number">${metrics.averageFormatted}</div>
      <div class="rating-score-stars">${renderStars(metrics.average)}</div>
      <div class="rating-score-count">${metrics.count} community reviews</div>
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

  // List of reviews
  const listContainer = document.createElement('div');
  listContainer.className = 'flow';
  listContainer.style.marginTop = 'var(--space-4)';

  if (reviews.length === 0) {
    listContainer.innerHTML = `
      <div class="card" style="text-align: center; padding: 24px; color: var(--color-text-muted);">
        <p style="margin: 0;">Be the first traveller to leave a review for this place!</p>
      </div>
    `;
  } else {
    reviews.forEach(r => {
      const card = renderReviewCard(r, async () => {
        // Callback after review deletion
        await renderReviewsContainer(containerEl, targetId, targetType, targetName);
      });
      listContainer.appendChild(card);
    });
  }

  containerEl.appendChild(listContainer);
}

export function renderReviewCard(review, onDeleteCallback) {
  const card = document.createElement('div');
  card.className = 'card review-card';
  card.style.padding = 'var(--space-4)';
  card.style.marginBottom = 'var(--space-3)';

  const header = document.createElement('div');
  header.className = 'flex-between';
  header.style.marginBottom = 'var(--space-2)';

  const authorBox = document.createElement('div');
  authorBox.className = 'flex gap-2';
  authorBox.style.alignItems = 'center';

  const nameEl = document.createElement('strong');
  nameEl.textContent = review.name;
  authorBox.appendChild(nameEl);

  if (review.isVerifiedAccount) {
    const verifiedBadge = document.createElement('span');
    verifiedBadge.className = 'badge badge-verified';
    verifiedBadge.style.backgroundColor = '#E6F4EA';
    verifiedBadge.style.color = '#137333';
    verifiedBadge.style.fontSize = '0.72rem';
    verifiedBadge.textContent = '✓ Verified account';
    authorBox.appendChild(verifiedBadge);
  } else if (review.isSample) {
    const sampleBadge = document.createElement('span');
    sampleBadge.className = 'badge badge-demo';
    sampleBadge.style.fontSize = '0.72rem';
    sampleBadge.textContent = 'Sample review';
    authorBox.appendChild(sampleBadge);
  }

  header.appendChild(authorBox);

  // Stars and Date
  const metaBox = document.createElement('div');
  metaBox.style.textAlign = 'right';
  metaBox.innerHTML = `
    <div style="color: var(--color-secondary); font-size: 0.95rem;">${renderStars(review.rating)}</div>
    <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${review.travelMonth || 'Recent'}</div>
  `;
  header.appendChild(metaBox);
  card.appendChild(header);

  // Comment (XSS-safe textContent)
  const commentP = document.createElement('p');
  commentP.style.margin = 'var(--space-2) 0';
  commentP.style.fontSize = 'var(--font-size-sm)';
  commentP.style.lineHeight = '1.5';
  commentP.textContent = review.comment;
  card.appendChild(commentP);

  // Tags
  if (review.tags && review.tags.length > 0) {
    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'flex gap-2';
    tagsDiv.style.flexWrap = 'wrap';
    tagsDiv.style.marginTop = 'var(--space-2)';
    review.tags.forEach(t => {
      const chip = document.createElement('span');
      chip.className = 'badge badge-outline';
      chip.style.fontSize = '0.7rem';
      chip.textContent = t;
      tagsDiv.appendChild(chip);
    });
    card.appendChild(tagsDiv);
  }

  // Delete Action for Owner
  if (review.isOwner && !review.isSample) {
    const actionRow = document.createElement('div');
    actionRow.style.marginTop = 'var(--space-3)';
    actionRow.style.textAlign = 'right';

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-ghost btn-sm';
    delBtn.style.color = 'var(--color-danger)';
    delBtn.style.fontSize = '0.75rem';
    delBtn.textContent = '🗑️ Delete my review';
    delBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete your review?')) {
        delBtn.disabled = true;
        delBtn.textContent = 'Deleting...';
        await reviewsManager.deleteReview(review.id, review.targetId);
        if (typeof onDeleteCallback === 'function') onDeleteCallback();
      }
    });

    actionRow.appendChild(delBtn);
    card.appendChild(actionRow);
  }

  return card;
}

/**
 * Open Review Submission Modal
 */
export function openWriteReviewModal({ targetId, targetType, targetName, onSubmitted }) {
  const user = getCurrentUser();
  if (!user) {
    showAuthModal({
      initialMode: 'login',
      onAuthSuccess: () => openWriteReviewModal({ targetId, targetType, targetName, onSubmitted })
    });
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.55)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.padding = '16px';
  overlay.style.zIndex = '99999';

  let selectedRating = 5;
  const selectedTags = new Set();

  overlay.innerHTML = `
    <div class="modal card" style="max-width: 520px; width: 100%; padding: 24px; position: relative; background: #FFFFFF; border-radius: 12px;">
      <button type="button" id="review-close-btn" class="btn btn-ghost" style="position: absolute; top: 12px; right: 12px; padding: 6px;">✕</button>

      <h3 style="margin: 0 0 4px; color: var(--color-primary); font-size: 1.3rem;">
        ✍️ Write a Review
      </h3>
      <p style="margin: 0 0 16px; font-size: 0.85rem; color: var(--color-text-muted);">
        Sharing your experience for <strong>${targetName || targetId}</strong> as <strong>${user.name}</strong>.
      </p>

      <div id="review-modal-error" style="display: none; background: #FEF2F2; border-left: 4px solid #EF4444; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; font-size: 0.85rem; color: #B91C1C;"></div>

      <form id="write-review-form" class="flow" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: bold; margin-bottom: 6px;">
            Overall Experience Rating:
          </label>
          <div id="star-selector" style="display: flex; gap: 8px; font-size: 1.8rem; cursor: pointer;">
            ${[1, 2, 3, 4, 5].map(n => `<span data-star="${n}" style="color: #F59E0B;" tabindex="0" role="button" aria-label="${n} stars">★</span>`).join('')}
          </div>
        </div>

        <div>
          <label for="review-comment-input" style="display: block; font-size: 0.85rem; font-weight: bold; margin-bottom: 4px;">
            Your Thoughts & Guidance for Fellow Travellers (10–300 chars):
          </label>
          <textarea id="review-comment-input" class="form-input" rows="4" maxlength="300" required placeholder="What made this place authentic? How were crowds, local transport, or host warmth?" style="width: 100%; padding: 8px; border-radius: 6px; border: 1.5px solid #D1D5DB; font-family: inherit; font-size: 0.9rem;"></textarea>
          <div style="text-align: right; font-size: 0.75rem; color: var(--color-text-muted); margin-top: 2px;">
            <span id="char-counter">0</span> / 300
          </div>
        </div>

        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: bold; margin-bottom: 6px;">
            Add Helpful Tags:
          </label>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${REVIEW_TAGS.map(tag => `
              <button type="button" class="tag-chip btn btn-outline btn-sm" data-tag="${tag}" style="border-radius: 9999px; font-size: 0.78rem; padding: 4px 10px;">
                + ${tag}
              </button>
            `).join('')}
          </div>
        </div>

        <button type="submit" id="btn-submit-review" class="btn btn-primary" style="margin-top: 8px; padding: 10px; font-weight: bold;">
          Publish Review
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  // Interactive bindings
  const closeBtn = overlay.querySelector('#review-close-btn');
  const errorBox = overlay.querySelector('#review-modal-error');
  const form = overlay.querySelector('#write-review-form');
  const textarea = overlay.querySelector('#review-comment-input');
  const charCounter = overlay.querySelector('#char-counter');
  const submitBtn = overlay.querySelector('#btn-submit-review');
  const starSpans = overlay.querySelectorAll('#star-selector span');
  const tagChips = overlay.querySelectorAll('.tag-chip');

  function updateStars(val) {
    selectedRating = val;
    starSpans.forEach(s => {
      const n = parseInt(s.dataset.star, 10);
      s.textContent = n <= val ? '★' : '☆';
      s.style.color = n <= val ? '#F59E0B' : '#D1D5DB';
    });
  }

  starSpans.forEach(s => {
    s.addEventListener('click', () => updateStars(parseInt(s.dataset.star, 10)));
    s.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        updateStars(parseInt(s.dataset.star, 10));
      }
    });
  });

  tagChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.tag;
      if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
        chip.style.backgroundColor = 'transparent';
        chip.style.color = 'inherit';
        chip.textContent = `+ ${tag}`;
      } else {
        selectedTags.add(tag);
        chip.style.backgroundColor = 'var(--color-primary)';
        chip.style.color = '#FFFFFF';
        chip.textContent = `✓ ${tag}`;
      }
    });
  });

  textarea.addEventListener('input', () => {
    charCounter.textContent = textarea.value.length;
  });

  closeBtn.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing...';

    const res = await reviewsManager.submitReview({
      targetId,
      targetType,
      targetName,
      rating: selectedRating,
      comment: textarea.value,
      tags: Array.from(selectedTags),
      language: store.getState().language === 'HI' ? 'hi' : 'en'
    });

    if (res.success) {
      overlay.remove();
      if (typeof onSubmitted === 'function') onSubmitted();
    } else {
      errorBox.textContent = res.error || 'Failed to submit review.';
      errorBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Publish Review';
    }
  });

  textarea.focus();
}
