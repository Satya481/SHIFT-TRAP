// game/audio.js
// High-fidelity procedural Web Audio synthesizer for SHIFT//TRAP
// Generates dynamic cybernetic sound effects and an adaptive procedural electronic soundtrack.

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    // Volume settings (0.0 to 1.0)
    this.masterVolume = 0.8;
    this.sfxVolume = 0.85;
    this.musicVolume = 0.55;
    this.isMuted = false;

    // Music state
    this.musicRunning = false;
    this.musicTimer = null;
    this.bpm = 120;
    this.currentStep = 0;
    this.scale = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0]; // D Minor pentatonic/natural
    this.bassFreq = 73.42; // D2
    this.droneOsc = null;
    this.droneFilter = null;
    this.droneGain = null;
    this.musicIntensity = 0; // 0 to 1

    this.loadSettings();
  }

  loadSettings() {
    if (typeof window === "undefined") return;
    try {
      const savedMaster = localStorage.getItem("shift-trap-master-vol");
      const savedSfx = localStorage.getItem("shift-trap-sfx-vol");
      const savedMusic = localStorage.getItem("shift-trap-music-vol");
      const savedMute = localStorage.getItem("shift-trap-muted");

      if (savedMaster !== null) this.masterVolume = Math.max(0, Math.min(1, parseFloat(savedMaster)));
      if (savedSfx !== null) this.sfxVolume = Math.max(0, Math.min(1, parseFloat(savedSfx)));
      if (savedMusic !== null) this.musicVolume = Math.max(0, Math.min(1, parseFloat(savedMusic)));
      if (savedMute !== null) this.isMuted = savedMute === "true";
    } catch {
      // LocalStorage fallback
    }
  }

  saveSettings() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("shift-trap-master-vol", String(this.masterVolume));
      localStorage.setItem("shift-trap-sfx-vol", String(this.sfxVolume));
      localStorage.setItem("shift-trap-music-vol", String(this.musicVolume));
      localStorage.setItem("shift-trap-muted", String(this.isMuted));
    } catch {
      // LocalStorage fallback
    }
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music bus
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.startDrone();
    } catch {
      // Audio context error
    }
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    this.saveSettings();
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    this.saveSettings();
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
    }
  }

  setMusicVolume(val) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    this.saveSettings();
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.saveSettings();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  // --- PROCEDURAL SFX ---

  play(type, detail = {}) {
    if (this.isMuted || this.sfxVolume <= 0.01) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    try {
      switch (type) {
        case "jump": {
          // Punchy synth jump with pitch bend and slight low-end thump
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(190, now);
          osc.frequency.exponentialRampToValueAtTime(580, now + 0.14);

          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.17);
          break;
        }

        case "dash": {
          // High-tech phase whoosh with filtered noise burst
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.18);

          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.setValueAtTime(1400, now);
          filter.Q.setValueAtTime(3, now);

          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }

        case "land": {
          // Subtle soft bass thud on platform touch down
          const vel = Math.min(1, (detail.velocity || 4) / 12);
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.09);

          gain.gain.setValueAtTime(0.15 * vel, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.11);
          break;
        }

        case "bounce": {
          // Springy neon bounce pad
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);

          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.25);
          break;
        }

        case "telegraph": {
          // Warning laser ping before trap materializes
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);

          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.11);
          break;
        }

        case "ai": {
          // Threat signature / trap deployed
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = "sawtooth";
          osc2.type = "square";
          osc1.frequency.setValueAtTime(540, now);
          osc1.frequency.exponentialRampToValueAtTime(140, now + 0.18);
          osc2.frequency.setValueAtTime(270, now);
          osc2.frequency.exponentialRampToValueAtTime(70, now + 0.18);

          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(1200, now);

          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(gain);
          gain.connect(this.sfxGain);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.22);
          osc2.stop(now + 0.22);
          break;
        }

        case "laser": {
          // Laser beam fire zap
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(1600, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.28);

          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.32);
          break;
        }

        case "crumble": {
          // Stone platform creak / break
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(110, now);
          osc.frequency.setValueAtTime(80, now + 0.05);

          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.14);
          break;
        }

        case "inversion": {
          // Glitch / Control Inversion alarm
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(740, now);
          osc.frequency.setValueAtTime(420, now + 0.07);
          osc.frequency.setValueAtTime(840, now + 0.14);

          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.28);
          break;
        }

        case "terminal": {
          // Core terminal hacked / deactivated
          const notes = [440, 554.37, 659.25, 880];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const noteStart = now + idx * 0.06;
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, noteStart);

            gain.gain.setValueAtTime(0.18, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.18);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(noteStart);
            osc.stop(noteStart + 0.2);
          });
          break;
        }

        case "death": {
          // Dramatic cybernetic detonation with heavy sub drop and resonant crunch
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = "sawtooth";
          osc2.type = "sine";

          osc1.frequency.setValueAtTime(320, now);
          osc1.frequency.exponentialRampToValueAtTime(30, now + 0.42);

          osc2.frequency.setValueAtTime(140, now);
          osc2.frequency.exponentialRampToValueAtTime(25, now + 0.45);

          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(1600, now);
          filter.frequency.exponentialRampToValueAtTime(120, now + 0.4);

          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(gain);
          gain.connect(this.sfxGain);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.46);
          osc2.stop(now + 0.46);
          break;
        }

        case "level": {
          // Sector clear fanfare: crisp ascending cyber arpeggio
          const chord = [293.66, 369.99, 440.0, 587.33, 739.99]; // D Major / Lydian bright resolution
          chord.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const noteStart = now + idx * 0.055;
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, noteStart);

            gain.gain.setValueAtTime(0.22, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(noteStart);
            osc.stop(noteStart + 0.38);
          });
          break;
        }

        case "pause": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(350, now);
          osc.frequency.setValueAtTime(280, now + 0.08);

          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }

        case "click": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(800, now);

          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }

        case "wall_jump": {
          // Sharp energetic kick sound with rising resonance
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(240, now);
          osc.frequency.exponentialRampToValueAtTime(620, now + 0.12);

          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.setValueAtTime(800, now);
          filter.Q.setValueAtTime(4, now);

          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }

        case "wall_slide": {
          // Subtle friction friction tone
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(140 + Math.random() * 40, now);

          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.07);
          break;
        }

        case "ring_refill": {
          // Sparkling high-tech energy chime that restores dash
          const freqs = [587.33, 880, 1174.66, 1760];
          freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = now + i * 0.04;
            osc.type = "sine";
            osc.frequency.setValueAtTime(f, t);

            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.18);
          });
          break;
        }

        case "cube_collect": {
          // Bright crystal pickup chime
          const freqs = [659.25, 987.77, 1318.51];
          freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = now + i * 0.05;
            osc.type = "triangle";
            osc.frequency.setValueAtTime(f, t);

            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.24);
          });
          break;
        }

        case "achievement": {
          // Grand digital achievement fanfare
          const notes = [440, 554.37, 659.25, 880, 1108.73];
          notes.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = now + i * 0.06;
            osc.type = "triangle";
            osc.frequency.setValueAtTime(f, t);

            gain.gain.setValueAtTime(0.24, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.38);
          });
          break;
        }

        case "boss_laser": {
          // Menacing charge and death beam blast
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.linearRampToValueAtTime(950, now + 0.35);
          osc.frequency.exponentialRampToValueAtTime(140, now + 0.65);

          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(1800, now);

          gain.gain.setValueAtTime(0.28, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.7);
          break;
        }

        default:
          break;
      }
    } catch {
      // Audio playback exception safety
    }
  }

  // --- PROCEDURAL BACKGROUND SOUNDTRACK ---

  startDrone() {
    if (!this.ctx || this.droneOsc) return;

    try {
      const ctx = this.ctx;
      this.droneOsc = ctx.createOscillator();
      this.droneOsc.type = "sawtooth";
      this.droneOsc.frequency.setValueAtTime(this.bassFreq, ctx.currentTime);

      this.droneFilter = ctx.createBiquadFilter();
      this.droneFilter.type = "lowpass";
      this.droneFilter.frequency.setValueAtTime(260, ctx.currentTime);
      this.droneFilter.Q.setValueAtTime(4, ctx.currentTime);

      this.droneGain = ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.12, ctx.currentTime);

      this.droneOsc.connect(this.droneFilter);
      this.droneFilter.connect(this.droneGain);
      this.droneGain.connect(this.musicGain);

      this.droneOsc.start();
    } catch {
      // Drone init error
    }
  }

  startMusic() {
    this.init();
    if (!this.ctx || this.musicRunning) return;
    this.musicRunning = true;
    this.stepMusic();
  }

  stopMusic() {
    this.musicRunning = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  setIntensity(level) {
    this.musicIntensity = Math.max(0, Math.min(1, level));
    if (this.droneFilter && this.ctx) {
      // Open filter up as threat/aggression increases (from 220Hz up to 1400Hz)
      const targetFreq = 220 + this.musicIntensity * 1100;
      this.droneFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.2);
    }
  }

  stepMusic() {
    if (!this.musicRunning || !this.ctx || !this.musicGain) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const step = this.currentStep % 16;
    this.currentStep++;

    // Calculate tempo: 120 base, up to 148 during high intensity
    this.bpm = 118 + this.musicIntensity * 28;
    const stepDuration = 60 / this.bpm / 4; // 16th note

    if (!this.isMuted && this.musicVolume > 0.01) {
      try {
        // Kick on beats 0, 4, 8, 12
        if (step % 4 === 0) {
          const kickOsc = ctx.createOscillator();
          const kickGain = ctx.createGain();
          kickOsc.type = "sine";
          kickOsc.frequency.setValueAtTime(110, now);
          kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.09);

          kickGain.gain.setValueAtTime(0.18 + this.musicIntensity * 0.12, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

          kickOsc.connect(kickGain);
          kickGain.connect(this.musicGain);
          kickOsc.start(now);
          kickOsc.stop(now + 0.12);
        }

        // Hi-hat / pulse on off-beats
        if (step % 2 === 1 && (this.musicIntensity > 0.2 || step % 4 === 2)) {
          const hatOsc = ctx.createOscillator();
          const hatGain = ctx.createGain();
          hatOsc.type = "square";
          hatOsc.frequency.setValueAtTime(1200 + Math.random() * 400, now);

          const hatFilter = ctx.createBiquadFilter();
          hatFilter.type = "highpass";
          hatFilter.frequency.setValueAtTime(5000, now);

          hatGain.gain.setValueAtTime(0.02 + this.musicIntensity * 0.03, now);
          hatGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

          hatOsc.connect(hatFilter);
          hatFilter.connect(hatGain);
          hatGain.connect(this.musicGain);
          hatOsc.start(now);
          hatOsc.stop(now + 0.05);
        }

        // Synth Arpeggio note
        // Patterns vary based on step and intensity
        const arpPattern = [0, 2, 4, 7, 3, 5, 2, 6, 0, 4, 5, 7, 2, 4, 6, 3];
        const noteIdx = arpPattern[step] % this.scale.length;
        const freq = this.scale[noteIdx];

        if (freq && (step % 2 === 0 || this.musicIntensity > 0.4)) {
          const arpOsc = ctx.createOscillator();
          const arpGain = ctx.createGain();
          arpOsc.type = this.musicIntensity > 0.6 ? "sawtooth" : "triangle";
          arpOsc.frequency.setValueAtTime(freq, now);

          const arpFilter = ctx.createBiquadFilter();
          arpFilter.type = "lowpass";
          arpFilter.frequency.setValueAtTime(700 + this.musicIntensity * 1200, now);

          arpGain.gain.setValueAtTime(0.06 + this.musicIntensity * 0.05, now);
          arpGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.5);

          arpOsc.connect(arpFilter);
          arpFilter.connect(arpGain);
          arpGain.connect(this.musicGain);

          arpOsc.start(now);
          arpOsc.stop(now + stepDuration * 1.6);
        }
      } catch {
        // Step error safety
      }
    }

    this.musicTimer = setTimeout(() => {
      this.stepMusic();
    }, stepDuration * 1000);
  }
}

export const sound = new SoundEngine();
