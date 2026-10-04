// game/announcer.js
// Cybernetic tactical robotic speech synthesizer using the Web Speech API.

class CyberAnnouncer {
  constructor() {
    this.enabled = true;
    this.synth = null;
    this.voice = null;
    this.loadSettings();
  }

  loadSettings() {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("shift-trap-announcer");
      if (saved !== null) {
        this.enabled = saved === "true";
      }
    } catch {
      // LocalStorage error
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("shift-trap-announcer", String(this.enabled));
      } catch {
        // LocalStorage error
      }
    }
    return this.enabled;
  }

  init() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    this.synth = window.speechSynthesis;
    const voices = this.synth.getVoices();
    // Prefer English robotic or deep female/male voice if available
    this.voice =
      voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("David"))) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0];
  }

  speak(text) {
    if (!this.enabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    try {
      this.init();
      if (!this.synth) return;

      // Cancel ongoing speech to prevent queues
      this.synth.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      if (this.voice) utter.voice = this.voice;
      utter.pitch = 0.85; // Robotic slightly low pitch
      utter.rate = 1.08;  // Crisp tactical cadence
      utter.volume = 0.75;

      this.synth.speak(utter);
    } catch {
      // Audio speech safety
    }
  }
}

export const announcer = new CyberAnnouncer();
