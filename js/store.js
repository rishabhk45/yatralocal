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
  bookings: [
    {
      id: 'YL-2026-8492',
      destination: 'Manali, Himachal Pradesh',
      destinationId: 'manali',
      createdAt: '2026-10-20T10:30:00.000Z',
      status: 'Confirmed (Simulated)',
      isSample: true,
      travellerName: 'Aarav Sharma',
      travellerPhone: '+91 98765 43210',
      days: 3,
      dates: '15-18 Nov 2026',
      stay: {
        id: 'stay-manali-1',
        name: 'Burwa Apple Woods Homestay',
        hostName: 'Uncle Ramesh Thakur',
        phone: '+91 98160 44221',
        area: 'Burwa Village, Upper Manali',
        pricePerNight: 2200
      },
      guide: {
        id: 'guide-manali-1',
        name: 'Kewal Sharma',
        phone: '+91 94180 55663',
        ratePerDay: 1500
      },
      grandTotal: 11100,
      hostPayout: 9990,
      notes: 'Ground floor room requested for elderly family member.'
    },
    {
      id: 'YL-2026-3104',
      destination: 'Hampi, Karnataka',
      destinationId: 'hampi',
      createdAt: '2026-09-14T14:20:00.000Z',
      status: 'Completed (Simulated)',
      isSample: true,
      travellerName: 'Aarav Sharma',
      travellerPhone: '+91 98765 43210',
      days: 2,
      dates: '22-24 Sep 2026',
      stay: {
        id: 'stay-hampi-1',
        name: 'Anegundi Kishkindha Heritage Homestay',
        hostName: 'Manjula & Sharanappa',
        phone: '+91 94481 22334',
        area: 'Anegundi Heritage Village',
        pricePerNight: 1800
      },
      guide: {
        id: 'guide-hampi-1',
        name: "Chandrashekhar 'Shekhar' K.",
        phone: '+91 98450 77881',
        ratePerDay: 1400
      },
      grandTotal: 6400,
      hostPayout: 5760,
      notes: 'Quiet village location, amazing local food.'
    }
  ],
  draftBooking: null,
  ownerSession: {
    loggedIn: false,
    hostId: 'stay-manali-1',
    hostName: 'Uncle Ramesh Thakur',
    property: 'Burwa Apple Woods Homestay'
  },
  hostOffers: {
    'stay-manali-1': { discountPercent: 15, validUntil: '2026-11-30', perk: 'Free hot apple cider & orchard tour' },
    'stay-rishikesh-1': { discountPercent: 10, validUntil: '2026-12-15', perk: 'Complimentary morning riverside meditation session' },
    'stay-munnar-1': { discountPercent: 20, validUntil: '2026-11-25', perk: 'Free guided spice garden tour with host Joseph' }
  },
  saralMode: false,
  language: 'EN', // 'EN' | 'HI'
  sosSettings: {
    emergencyContacts: [
      { id: 'c1', name: 'Papa (Rajesh Sharma)', phone: '+91 98765 43210', relation: 'Father' },
      { id: 'c2', name: 'Pooja (Sister)', phone: '+91 98111 22334', relation: 'Sister' }
    ],
    medicalNotes: 'Senior traveller: Hypertension, blood pressure medication daily. Carries inhaler.',
    shareLiveLocation: true
  },
  sosLogs: [
    {
      id: 'log_drill_1',
      timestamp: Date.now() - 86400000 * 2,
      eventType: 'RESOLVED',
      locationLabel: 'Burwa Valley GPS (Simulated)',
      status: 'SAFE',
      channel: 'sms',
      responseTimeSec: 42
    },
    {
      id: 'log_drill_2',
      timestamp: Date.now() - 86400000 * 5,
      eventType: 'DISPATCH',
      locationLabel: 'Solang Roadway GPS (Drill)',
      status: 'Sent',
      channel: 'whatsapp',
      responseTimeSec: 38
    }
  ],
  currentUser: null,
  activePlace: null
};

class Store {
  constructor() {
    this.state = this._loadState();
    this.listeners = new Set();
  }

  _loadState() {
    try {
      if (typeof localStorage === 'undefined') return defaultState;
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return defaultState;
      const parsed = JSON.parse(saved);
      if (!parsed.bookings || parsed.bookings.length === 0) {
        parsed.bookings = defaultState.bookings;
      }
      if (!parsed.sosLogs || parsed.sosLogs.length === 0) {
        parsed.sosLogs = defaultState.sosLogs;
      }
      if (!parsed.hostOffers || Object.keys(parsed.hostOffers).length === 0) {
        parsed.hostOffers = defaultState.hostOffers;
      }
      return { ...defaultState, ...parsed };
    } catch (err) {
      console.warn('Failed to load state from localStorage:', err);
      return defaultState;
    }
  }

  _saveState() {
    try {
      if (typeof localStorage === 'undefined') return;
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

  getSosSettings() {
    return this.state.sosSettings || {
      emergencyContacts: [],
      medicalNotes: '',
      shareLiveLocation: true
    };
  }

  updateSosSettings(newSettings) {
    const updated = {
      ...(this.state.sosSettings || {}),
      ...newSettings
    };
    this.setState({ sosSettings: updated });
    return updated;
  }

  addSosLog(logData) {
    const logs = this.state.sosLogs || [];
    const newEntry = {
      id: `SOS-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      status: 'simulated_dispatch',
      ...logData
    };
    const updated = [newEntry, ...logs].slice(0, 20); // Keep last 20 logs
    this.setState({ sosLogs: updated });
    return newEntry;
  }

  getSosLogs() {
    return this.state.sosLogs || [];
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
