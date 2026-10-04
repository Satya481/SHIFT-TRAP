// game/achievements.js
// Achievement system and unlockable character skins for SHIFT//TRAP.

export const ACHIEVEMENTS = [
  {
    id: "FIRST_BREACH",
    title: "FIRST BREACH",
    desc: "Escape Sector 01 successfully",
    icon: "🔓",
  },
  {
    id: "WALL_RUNNER",
    title: "WALL RUNNER",
    desc: "Perform your first Wall Jump off a platform",
    icon: "🧗",
  },
  {
    id: "PHASE_DANCER",
    title: "PHASE DANCER",
    desc: "Execute 10 Phase Dashes",
    icon: "⚡",
  },
  {
    id: "DATA_HOARDER",
    title: "DATA HOARDER",
    desc: "Collect all 3 Cyber Cubes in a single sector",
    icon: "💎",
  },
  {
    id: "UNTOUCHABLE",
    title: "UNTOUCHABLE",
    desc: "Complete Sector 05 without taking damage",
    icon: "🛡️",
  },
  {
    id: "SPEED_DEMON",
    title: "SPEED DEMON",
    desc: "Earn Gold Speed Medals on 5 sectors",
    icon: "🥇",
  },
  {
    id: "SINGULARITY_BROKEN",
    title: "SINGULARITY BROKEN",
    desc: "Defeat the Overseer Core in Sector 07",
    icon: "👁️",
  },
  {
    id: "GAUNTLET_LEGEND",
    title: "GAUNTLET LEGEND",
    desc: "Reach Stage 5 in the Endless Survival Gauntlet",
    icon: "🏆",
  },
  {
    id: "SYSTEM_HACKER",
    title: "SYSTEM HACKER",
    desc: "Disable every Overseer terminal without losing a life",
    icon: "💾",
  },
  {
    id: "GAUNTLET_MASTER",
    title: "GAUNTLET MASTER",
    desc: "Reach Stage 10 in Endless Mode",
    icon: "🏁",
  },
  {
    id: "OVERCLOCKER",
    title: "OVERCLOCKER",
    desc: "Unlock all 4 Cybernetic Chassis Skins",
    icon: "👑",
  },
];

export const SKINS = [
  {
    id: "default",
    name: "PLATINUM CORE",
    color: "#f4f0e8",
    eyeColor: "#ff4d3d",
    glowColor: "rgba(244, 240, 232, 0.4)",
    trailColor: "#f4f0e8",
    unlocked: true,
    requirement: "Default unlocked",
  },
  {
    id: "cyan",
    name: "NEON CYAN OVERCLOCK",
    color: "#56b4f5",
    eyeColor: "#ffffff",
    glowColor: "rgba(86, 180, 245, 0.6)",
    trailColor: "#56b4f5",
    unlocked: false,
    requirement: "Complete 2 Clean Runs",
  },
  {
    id: "void",
    name: "GLITCH VOID",
    color: "#b066ff",
    eyeColor: "#7cff6b",
    glowColor: "rgba(176, 102, 255, 0.6)",
    trailColor: "#b066ff",
    unlocked: false,
    requirement: "Collect 5 Cyber Cubes",
  },
  {
    id: "gold",
    name: "GOLD PROTOTYPE",
    color: "#ffd700",
    eyeColor: "#101114",
    glowColor: "rgba(255, 215, 0, 0.7)",
    trailColor: "#ffd700",
    unlocked: false,
    requirement: "Earn 2 Gold Medals",
  },
];

export class AchievementTracker {
  constructor(onUnlockCallback) {
    this.unlockedIds = new Set();
    this.onUnlock = onUnlockCallback;
    this.activeToast = null;
    this.toastTimer = null;
    this.load();
  }

  load() {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("shift-trap-achievements");
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) {
          this.unlockedIds = new Set(arr);
        }
      }
    } catch {
      // LocalStorage error
    }
  }

  save() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        "shift-trap-achievements",
        JSON.stringify(Array.from(this.unlockedIds))
      );
    } catch {
      // LocalStorage error
    }
  }

  isUnlocked(id) {
    return this.unlockedIds.has(id);
  }

  unlock(id) {
    if (this.unlockedIds.has(id)) return false;

    const ach = ACHIEVEMENTS.find((a) => a.id === id);
    if (!ach) return false;

    this.unlockedIds.add(id);
    this.save();

    this.activeToast = ach;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.activeToast = null;
    }, 4000);

    if (this.onUnlock) {
      this.onUnlock(ach);
    }

    return true;
  }
}
