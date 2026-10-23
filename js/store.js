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
  draftBooking: null,
  ownerSession: {
    loggedIn: false,
    hostId: 'stay-manali-1',
    hostName: 'Uncle Ramesh Thakur',
    property: 'Burwa Apple Woods Homestay'
  },
  hostOffers: {},
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

  addBooking(bookingData) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const year = new Date().getFullYear();
    const newBooking = {
      id: `YL-${year}-${randomSuffix}`,
      createdAt: new Date().toISOString(),
      status: 'Confirmed (Simulated)',
      ...bookingData
    };

    const currentBookings = this.state.bookings || [];
    const updatedBookings = [newBooking, ...currentBookings];

    this.setState({
      bookings: updatedBookings,
      draftBooking: null
    });

    return newBooking;
  }

  getBookings() {
    return this.state.bookings || [];
  }

  saveDraftBooking(draft) {
    this.setState({ draftBooking: draft });
  }

  getDraftBooking() {
    return this.state.draftBooking;
  }

  clearDraftBooking() {
    this.setState({ draftBooking: null });
  }

  loginAsOwner(hostId = 'stay-manali-1') {
    this.setState({
      ownerSession: {
        loggedIn: true,
        hostId,
        hostName: 'Uncle Ramesh Thakur',
        property: 'Burwa Apple Woods Homestay'
      }
    });
  }

  logoutOwner() {
    this.setState({
      ownerSession: {
        loggedIn: false,
        hostId: 'stay-manali-1',
        hostName: 'Uncle Ramesh Thakur',
        property: 'Burwa Apple Woods Homestay'
      }
    });
  }

  saveHostOffer(hostId, offerData) {
    const currentOffers = this.state.hostOffers || {};
    const updated = {
      ...currentOffers,
      [hostId]: {
        ...offerData,
        updatedAt: new Date().toISOString()
      }
    };
    this.setState({ hostOffers: updated });
    return updated[hostId];
  }

  getHostOffer(hostId) {
    return (this.state.hostOffers || {})[hostId] || null;
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
