/**
 * YatraLocal - Internationalization (i18n) Utility
 * Loads dictionary from /data/i18n.json and reacts to store language changes.
 */

import { store } from './store.js';

class I18nManager {
  constructor() {
    this.dictionary = {};
    this.isLoaded = false;
  }

  async init() {
    try {
      const candidates = ['data/i18n.json', '../data/i18n.json', '/data/i18n.json'];
      for (const url of candidates) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            this.dictionary = await res.json();
            this.isLoaded = true;
            return;
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Failed to load i18n dictionary, using fallbacks:', err);
    }
  }

  t(path, fallback = '') {
    const lang = store.getState().language || 'EN';
    const dict = this.dictionary[lang] || this.dictionary['EN'] || {};
    
    const parts = path.split('.');
    let cur = dict;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) {
        cur = cur[p];
      } else {
        return fallback || path;
      }
    }
    return typeof cur === 'string' ? cur : fallback || path;
  }

  /**
   * Apply translations to all DOM elements with data-i18n attributes
   */
  translateDOM() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        const text = this.t(key);
        if (text) {
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = text;
          } else {
            el.textContent = text;
          }
        }
      }
    });

    // Update document title if needed
    const pageTitleKey = document.querySelector('h1')?.getAttribute('data-i18n');
    if (pageTitleKey) {
      document.title = `YatraLocal - ${this.t(pageTitleKey)}`;
    }
  }
}

export const i18n = new I18nManager();
