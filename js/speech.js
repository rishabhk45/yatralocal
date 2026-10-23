/**
 * YatraLocal - Web Speech API Assistant
 * Provides text-to-speech voice guidance (English & Hindi) and optional voice input
 * designed for seniors, pilgrims, and low-tech users in Saral Mode.
 */

class SpeechAssistant {
  constructor() {
    this.synth = typeof window !== 'undefined' ? (window.speechSynthesis || null) : null;
    this.voices = [];
    this.isSupported = Boolean(this.synth);
    this.currentUtterance = null;
    this.onStatusChange = null;

    if (this.isSupported && typeof window !== 'undefined') {
      this._loadVoices();
      if (typeof window.speechSynthesis !== 'undefined' && typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
        window.speechSynthesis.onvoiceschanged = () => this._loadVoices();
      }
    }
  }

  _loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices() || [];
  }

  /**
   * Speak text in either English ('EN') or Hindi ('HI')
   */
  speak(text, lang = 'EN', onDone = null) {
    if (!this.isSupported) {
      console.warn('Speech synthesis is not supported on this browser.');
      return false;
    }

    this.stop();

    if (!text || !text.trim()) return false;

    // Remove emoji symbols before speaking for clearer reading
    const cleanText = text.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.88; // Slower, relaxed tempo for senior clarity
    utterance.pitch = 1.0;

    const voices = this.synth.getVoices() || this.voices;
    let selectedVoice = null;

    if (lang === 'HI') {
      // Look for Hindi voice
      selectedVoice = voices.find((v) => v.lang === 'hi-IN' || v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi'));
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = 'hi-IN';
      } else {
        // Fallback: Inform user and use Indian English voice or default
        utterance.lang = 'en-IN';
        selectedVoice = voices.find((v) => v.lang === 'en-IN' || v.name.includes('India')) || voices[0];
        if (selectedVoice) utterance.voice = selectedVoice;
        if (window.YatraApp && window.YatraApp.showToast) {
          window.YatraApp.showToast('Note: Hindi voice not installed on your device. Reading in English.');
        }
      }
    } else {
      // English (prefer Indian English if available)
      selectedVoice = voices.find((v) => v.lang === 'en-IN' || v.name.includes('India')) ||
                      voices.find((v) => v.lang.startsWith('en')) ||
                      voices[0];
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.lang = 'en-IN';
    }

    utterance.onstart = () => {
      if (this.onStatusChange) this.onStatusChange(true);
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      if (this.onStatusChange) this.onStatusChange(false);
      if (onDone) onDone();
    };

    utterance.onerror = (e) => {
      console.warn('Speech utterance error:', e);
      this.currentUtterance = null;
      if (this.onStatusChange) this.onStatusChange(false);
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
    return true;
  }

  stop() {
    if (!this.isSupported) return;
    this.synth.cancel();
    this.currentUtterance = null;
    if (this.onStatusChange) this.onStatusChange(false);
  }

  isSpeaking() {
    return Boolean(this.synth && this.synth.speaking);
  }

  /**
   * Optional Voice Input via SpeechRecognition API
   * Calls callback with (transcript, error)
   */
  startVoiceInput(onResult, onError) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onError) onError('Speech recognition is not supported in this browser. Please tap the button.');
      return null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (onResult) onResult(transcript.trim());
      };

      recognition.onerror = (event) => {
        if (onError) onError(event.error);
      };

      recognition.start();
      return recognition;
    } catch (err) {
      if (onError) onError(err.message);
      return null;
    }
  }
}

export const speechAssistant = new SpeechAssistant();
