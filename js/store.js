/**
 * YatraLocal - State Store
 * Persistent reactive store backed by localStorage.
 */

const STORAGE_KEY = 'yatralocal_store_v1';

const defaultState = {
  preferences: {
    destination: 'Manali, Himachal Pradesh',
    budget: 8000,
    days: 3,
    mood: 'peaceful', // 'peaceful' | 'spiritual' | 'heritage' | 'adventure'
    needsSeniorFriendly: false,
    needsLocalGuide: true
  },
  itinerary: null,
  selectedStay: null,
  selectedGuide: null,
  bookings: [],
  saralMode: false,
  language: 'EN' // 'EN' | 'HI'
};

class Store {
  constructor() {
    this.state = this._loadState();
    this.listeners = new Set();
  }

  _loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return defaultState;
      return { ...defaultState, ...JSON.parse(saved) };
    } catch (err) {
      console.warn('Failed to load state from localStorage:', err);
      return defaultState;
    }
  }

  _saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (err) {
      console.warn('Failed to save state to localStorage:', err);
    }
  }

  getState() {
    return { ...this.state };
  }

  setState(partialState) {
    this.state = { ...this.state, ...partialState };
    this._saveState();
    this._notify();
  }

  setSaralMode(enabled) {
    this.setState({ saralMode: Boolean(enabled) });
  }

  setLanguage(lang) {
    this.setState({ language: lang === 'HI' ? 'HI' : 'EN' });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Error in store listener:', err);
      }
    }
  }
}

export const store = new Store();
