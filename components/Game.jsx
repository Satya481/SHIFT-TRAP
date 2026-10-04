// components/Game.jsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { LEVELS } from "@/game/levels";
import { sound } from "@/game/audio";
import { announcer } from "@/game/announcer";
import {
  ACHIEVEMENTS,
  SKINS,
  AchievementTracker,
} from "@/game/achievements";
import {
  createPlayer,
  updatePhysics,
  checkWallSlide,
  tryJump,
  tryDash,
  refillDash,
  applyLanding,
  DASH_COOLDOWN,
} from "@/game/physics";
import {
  checkCollision,
  checkHazardCollision,
  resolvePlatformCollision,
} from "@/game/collision";
import { ParticleSystem } from "@/game/particles";
import { generateEndlessSector } from "@/game/endless";
import { chooseBestTrap } from "@/game/aiEngine";

const WIDTH = 1000;
const HEIGHT = 520;

export default function Game() {
  const canvasRef = useRef(null);
  const particleSys = useRef(new ParticleSystem());
  const tracker = useRef(null);

  // Input states
  const keys = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    dash: false,
  });

  // Gamepads
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const prevGamepadButtons = useRef({});

  // Core Game State Ref
  const game = useRef({
    mode: "campaign", // "campaign" | "endless" | "custom"
    levelIndex: 0,
    endlessStage: 1,
    endlessScore: 0,
    endlessMultiplier: 1,

    lives: 3,
    status: "menu", // "menu" | "playing" | "dying" | "transition" | "paused" | "dead" | "complete"

    player: null,
    platforms: [],
    obstacles: [],
    bouncePads: [],
    dashRings: [],
    cubes: [],
    speedRails: [],
    crushers: [],
    gravityZones: [],
    tripwires: [],
    drones: [],
    terminals: [],
    exit: null,

    // Boss Overdrive State
    bossOverdrive: false,
    bossLaser: {
      charging: false,
      firing: false,
      y: 360,
      timer: 0,
      cooldown: 180,
    },

    lastTime: 0,
    levelTime: 0,
    totalRunTime: 0,
    totalDeaths: 0,

    shake: 0,
    deathTimer: 0,
    transition: 0,

    controlInverted: false,
    inversionTimer: 0,
    mechanicTimer: 0,
    aiTimer: 0,
    aiMessageTimer: 0,
    deathReason: "ROUTE COMPROMISED",
    collisionFree: true,

    aiMemory: {
      leftMoves: 0,
      rightMoves: 0,
      jumps: 0,
      dashes: 0,
      aggression: 0,
    },

    directionChanges: 0,
    lastDirection: 0,
    movementDirection: 1,
    huntTimer: 0,
    trapSerial: 0,
    pendingTraps: [],
    ghostReplay: [],
    runReplay: [],
    ghostFrame: 0,
  });

  // UI States
  const [screen, setScreen] = useState("menu");
  const [levelNumber, setLevelNumber] = useState(1);
  const [lives, setLives] = useState(3);
  const [levelTime, setLevelTime] = useState(0);
  const [totalRunTime, setTotalRunTime] = useState(0);
  const [deathReason, setDeathReason] = useState("ROUTE COMPROMISED");
  const [unlocked, setUnlocked] = useState(1);
  const [bestTime, setBestTime] = useState(null);
  const [bestMedal, setBestMedal] = useState(null);
  const [endlessHighScore, setEndlessHighScore] = useState(0);
  const [endlessScore, setEndlessScore] = useState(0);
  const [cleanRuns, setCleanRuns] = useState({});
  const [levelMedals, setLevelMedals] = useState({});
  const [collectedCubes, setCollectedCubes] = useState(new Set());

  // Customization & Progression
  const [currentSkin, setCurrentSkin] = useState("default");
  const [toastMessage, setToastMessage] = useState(null);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showSkinsModal, setShowSkinsModal] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  // Custom Sector Builder State
  const [editorTool, setEditorTool] = useState("platform");
  const [customSectorData, setCustomSectorData] = useState({
    name: "CUSTOM SECTOR",
    platforms: [
      { x: 0, y: 480, width: 140, height: 40 },
      { x: 860, y: 400, width: 140, height: 40 },
    ],
    obstacles: [],
    bouncePads: [],
    dashRings: [],
    cubes: [],
    speedRails: [],
    crushers: [],
    gravityZones: [],
    tripwires: [],
    drones: [],
    aiZones: [],
    exit: { x: 940, y: 340, width: 35, height: 60 },
  });
  const [exportCode, setExportCode] = useState("");
  const [importCode, setImportCode] = useState("");

  const [aiActive, setAiActive] = useState(false);
  const [aiMessage, setAiMessage] = useState("SYSTEM ONLINE");
  const [transitionText, setTransitionText] = useState("");
  const [transitionReward, setTransitionReward] = useState(false);
  const [dashReady, setDashReady] = useState(true);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [shakeIntensity, setShakeIntensity] = useState(1.0);
  const [announcerActive, setAnnouncerActive] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [masterVol, setMasterVol] = useState(0.8);
  const [sfxVol, setSfxVol] = useState(0.85);
  const [musicVol, setMusicVol] = useState(0.55);

  const [liveStats, setLiveStats] = useState({
    obstacleCount: 0,
    aggression: 0,
    leftMoves: 0,
    rightMoves: 0,
    jumps: 0,
    dashes: 0,
    cubesCollected: 0,
  });

  // Achievement unlock handler
  const handleAchievementUnlock = useCallback((ach) => {
    sound.play("achievement");
    announcer.speak(`Achievement Unlocked: ${ach.title}`);
    setToastMessage(ach);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Initialize Tracker
  useEffect(() => {
    tracker.current = new AchievementTracker(handleAchievementUnlock);

    try {
      const savedUnlocked = localStorage.getItem("shift-trap-unlocked");
      if (savedUnlocked) {
        setUnlocked(Math.max(1, Math.min(LEVELS.length, Number(savedUnlocked))));
      }

      const savedEndless = localStorage.getItem("shift-trap-endless-best");
      if (savedEndless) setEndlessHighScore(Number(savedEndless));

      const savedSkin = localStorage.getItem("shift-trap-skin");
      if (savedSkin) setCurrentSkin(savedSkin);

      const savedCubes = localStorage.getItem("shift-trap-cubes");
      if (savedCubes) {
        setCollectedCubes(new Set(JSON.parse(savedCubes)));
      }

      const savedCrt = localStorage.getItem("shift-trap-crt");
      if (savedCrt !== null) setCrtEnabled(savedCrt === "true");

      const savedShake = localStorage.getItem("shift-trap-shake");
      if (savedShake !== null) setShakeIntensity(Number(savedShake));

      setAnnouncerActive(announcer.enabled);

      // Load medals and clean runs
      const medals = {};
      const cleans = {};
      for (let i = 0; i < LEVELS.length; i++) {
        const timeVal = localStorage.getItem(`shift-trap-best-${i}`);
        if (timeVal) {
          const t = Number(timeVal);
          const targets = LEVELS[i].targets;
          if (targets) {
            if (t <= targets.gold) medals[i] = "gold";
            else if (t <= targets.silver) medals[i] = "silver";
            else if (t <= targets.bronze) medals[i] = "bronze";
          }
        }
        const cleanVal = localStorage.getItem(`shift-trap-clean-${i}`);
        if (cleanVal === "true") cleans[i] = true;
      }
      setLevelMedals(medals);
      setCleanRuns(cleans);

      setIsMuted(sound.isMuted);
      setMasterVol(sound.masterVolume);
      setSfxVol(sound.sfxVolume);
      setMusicVol(sound.musicVolume);
    } catch {
      // Storage error safety
    }
  }, [handleAchievementUnlock]);

  function getBestTime(index) {
    try {
      const val = localStorage.getItem(`shift-trap-best-${index}`);
      return val ? Number(val) : null;
    } catch {
      return null;
    }
  }

  function saveBestTime(index, time, earnedCleanRun) {
    try {
      const prev = getBestTime(index);
      if (prev === null || time < prev) {
        localStorage.setItem(`shift-trap-best-${index}`, String(time));
        if (game.current.runReplay.length > 0) {
          localStorage.setItem(`shift-trap-ghost-${index}`, JSON.stringify(game.current.runReplay));
        }
        setBestTime(time);
      }

      const targets = LEVELS[index]?.targets;
      let medal = null;
      if (targets) {
        if (time <= targets.gold) {
          medal = "gold";
          const goldCount = LEVELS.reduce((count, level, levelIndex) => {
            const stored = levelIndex === index ? time : getBestTime(levelIndex);
            return count + (stored !== null && stored <= level.targets.gold ? 1 : 0);
          }, 0);
          if (goldCount >= 5) tracker.current?.unlock("SPEED_DEMON");
        } else if (time <= targets.silver) {
          medal = "silver";
        } else if (time <= targets.bronze) {
          medal = "bronze";
        }
      }

      if (medal) {
        setLevelMedals((prevMedals) => ({ ...prevMedals, [index]: medal }));
        setBestMedal(medal);
      }

      if (earnedCleanRun) {
        localStorage.setItem(`shift-trap-clean-${index}`, "true");
        setCleanRuns((prevClean) => ({ ...prevClean, [index]: true }));
        if (index === 4) tracker.current?.unlock("UNTOUCHABLE");
      }

      // Check Sector 01 Achievement
      if (index === 0) {
        tracker.current?.unlock("FIRST_BREACH");
      }
      // Check Sector 07 Boss Achievement
      if (index === 6) {
            tracker.current?.unlock("SINGULARITY_BROKEN");
      }
    } catch {
      // Storage error safety
    }
  }

  // --- LEVEL LOADING ---

  const loadLevel = useCallback((index, isNewRun = false) => {
    let levelData;

    if (game.current.mode === "campaign") {
      levelData = LEVELS[index];
    } else if (game.current.mode === "endless") {
      levelData = generateEndlessSector(game.current.endlessStage);
    } else {
      levelData = {
        id: 999,
        name: customSectorData.name || "CUSTOM SECTOR",
        player: { x: 50, y: 420, width: 28, height: 28 },
        exit: customSectorData.exit,
        platforms: customSectorData.platforms,
        obstacles: customSectorData.obstacles,
        bouncePads: customSectorData.bouncePads,
        dashRings: customSectorData.dashRings,
        cubes: customSectorData.cubes,
        speedRails: customSectorData.speedRails,
        crushers: customSectorData.crushers,
        gravityZones: customSectorData.gravityZones,
        tripwires: customSectorData.tripwires,
        drones: customSectorData.drones,
        aiZones: customSectorData.aiZones,
        mechanics: {},
      };
    }

    game.current.levelIndex = index;
    game.current.status = "playing";
    game.current.levelTime = 0;
    if (isNewRun) {
      game.current.totalRunTime = 0;
      game.current.totalDeaths = 0;
      game.current.lives = 3;
      setLives(3);
    }

    game.current.aiTimer = 0;
    game.current.shake = 0;
    game.current.deathTimer = 0;
    game.current.transition = 0;

    game.current.controlInverted = false;
    game.current.inversionTimer = 0;
    game.current.mechanicTimer = 0;
    game.current.aiMessageTimer = 0;
    game.current.deathReason = "ROUTE COMPROMISED";
    game.current.collisionFree = true;
    game.current.lastDirection = 0;
    game.current.directionChanges = 0;
    game.current.movementDirection = 1;
    game.current.huntTimer = 0;
    game.current.pendingTraps = [];
    game.current.runReplay = [];
    game.current.ghostFrame = 0;
    game.current.ghostReplay = [];
    if (game.current.mode === "campaign") {
      try {
        const savedGhost = localStorage.getItem(`shift-trap-ghost-${index}`);
        if (savedGhost) game.current.ghostReplay = JSON.parse(savedGhost);
      } catch {
        game.current.ghostReplay = [];
      }
    }

    // Boss Overdrive Reset
    game.current.bossOverdrive = false;
    game.current.bossLaser = {
      charging: false,
      firing: false,
      y: 360,
      timer: 0,
      cooldown: 180,
    };

    // Create player
    game.current.player = createPlayer(
      levelData.player.x,
      levelData.player.y,
      levelData.player.width,
      levelData.player.height
    );

    // Deep copy platforms & obstacles
    game.current.platforms = (levelData.platforms || []).map((p) => ({
      ...p,
      direction: p.direction || 1,
      touched: false,
      crumbleTimer: 0,
    }));

    game.current.obstacles = (levelData.obstacles || []).map((o) => ({
      ...o,
      activated: !o.hidden,
      pulse: 0,
    }));

    game.current.bouncePads = (levelData.bouncePads || []).map((b) => ({
      ...b,
      pulse: 0,
    }));

    game.current.speedRails = (levelData.speedRails || []).map((r) => ({ ...r }));
    game.current.crushers = (levelData.crushers || []).map((c) => ({ ...c, timer: c.phase || 0, y: c.y }));
    game.current.gravityZones = (levelData.gravityZones || []).map((z) => ({ ...z }));
    game.current.tripwires = (levelData.tripwires || []).map((t) => ({ ...t, triggered: false }));
    game.current.drones = (levelData.drones || []).map((d) => ({ ...d, direction: 1 }));
    game.current.aiZones = (levelData.aiZones || []).map((z) => ({ ...z }));

    game.current.dashRings = (levelData.dashRings || []).map((r) => ({
      ...r,
      active: true,
      cooldown: 0,
    }));

    game.current.cubes = (levelData.cubes || []).map((c) => ({
      ...c,
      collected: collectedCubes.has(c.id),
    }));

    game.current.terminals = (levelData.terminals || []).map((t) => ({
      ...t,
      hacked: false,
    }));

    game.current.exit = {
      ...levelData.exit,
      pulse: 0,
      locked: !!levelData.exit?.locked,
    };

    particleSys.current.reset();

    setLevelNumber(
      game.current.mode === "campaign"
        ? index + 1
        : game.current.mode === "endless"
        ? game.current.endlessStage
        : "CUSTOM"
    );
    setLevelTime(0);
    setDeathReason("ROUTE COMPROMISED");
    setBestTime(game.current.mode === "campaign" ? getBestTime(index) : null);
    setAiActive(index >= 1 || game.current.mode === "endless");
    setScreen("game");
    setTransitionText("");
    setTransitionReward(false);
    setDashReady(true);

    const initialMsg =
      game.current.mode === "campaign"
        ? index === 0
          ? "SYSTEM ONLINE // OBSERVING"
          : index === 1
          ? "PATTERN DETECTION ACTIVE"
          : index === 2
          ? "DECOY LAYER ARMED"
          : index === 3
          ? "ROUTE INVERSION READY"
          : index === 4
          ? "PREDICTION ENGINE LOCKED"
          : index === 5
          ? "HUNT PROTOCOL ENGAGED"
          : "SINGULARITY OVERSEER CORE ONLINE"
        : game.current.mode === "endless"
        ? `GAUNTLET STAGE ${game.current.endlessStage} // ADAPTING`
        : "CUSTOM SECTOR TEST RUN";

    setAiMessage(initialMsg);
    sound.startMusic();
    sound.setIntensity(index / 6);

    // Announce sector start
    if (game.current.mode === "campaign") {
      announcer.speak(`Sector ${index + 1}: ${levelData.name}`);
    }
  }, [collectedCubes, customSectorData]);

  function startCampaign(startIdx = 0) {
    game.current.mode = "campaign";
    loadLevel(startIdx, true);
  }

  function startEndless() {
    game.current.mode = "endless";
    game.current.endlessStage = 1;
    game.current.endlessScore = 0;
    game.current.endlessMultiplier = 1;
    setEndlessScore(0);
    loadLevel(0, true);
  }

  function startCustomPlay() {
    game.current.mode = "custom";
    setShowEditor(false);
    loadLevel(0, true);
  }

  // --- DEATH SYSTEM ---

  function loseLife(reason = "ROUTE COMPROMISED") {
    const state = game.current;
    if (state.status !== "playing") return;

    state.status = "dying";
    state.deathTimer = 32;
    state.shake = 16 * shakeIntensity;
    state.deathReason = reason;
    state.collisionFree = false;
    state.totalDeaths += 1;

    setDeathReason(reason);
    setAiMessage(reason);
    sound.play("death");

    if (state.player) {
      particleSys.current.addDeathBurst(
        state.player.x,
        state.player.y,
        state.player.width,
        state.player.height
      );
    }

    setScreen("dying");
  }

  function finishDeath() {
    const state = game.current;
    const nextLives = state.lives - 1;
    state.lives = nextLives;
    setLives(nextLives);

    if (nextLives <= 0) {
      state.status = "dead";
      setScreen("dead");
      sound.stopMusic();

      if (state.mode === "endless") {
        if (state.endlessScore > endlessHighScore) {
          setEndlessHighScore(state.endlessScore);
          try {
            localStorage.setItem("shift-trap-endless-best", String(state.endlessScore));
          } catch {
            // Ignore
          }
        }
      }
      return;
    }

    loadLevel(state.levelIndex);
  }

  // --- LEVEL COMPLETE SYSTEM ---

  function completeLevel() {
    const state = game.current;
    if (state.status !== "playing") return;

    sound.play("level");

    if (state.mode === "campaign") {
      saveBestTime(state.levelIndex, state.levelTime, state.collisionFree);

      const earnedBonusLife = state.collisionFree;
      if (earnedBonusLife) {
        state.lives = Math.min(5, state.lives + 1);
        setLives(state.lives);
        particleSys.current.addFloatingText("+1 BONUS LIFE", WIDTH / 2, 200, "#7cff6b");
        setAiMessage("CLEAN RUN // +1 LIFE BONUS");
      }

      setTransitionReward(earnedBonusLife);

      const next = state.levelIndex + 1;
      state.status = "transition";
      state.transition = 65;

      if (next + 1 > unlocked) {
        const newUnlocked = Math.min(LEVELS.length, next + 1);
        setUnlocked(newUnlocked);
        try {
          localStorage.setItem("shift-trap-unlocked", String(newUnlocked));
        } catch {
          // Ignore
        }
      }

      if (next >= LEVELS.length) {
        setTransitionText(earnedBonusLife ? "CLEAN RUN // SECTOR ESCAPED" : "ALL SECTORS CLEARED");
      } else {
        setTransitionText(earnedBonusLife ? `+1 LIFE // SECTOR ${next + 1}` : `SECTOR ${next + 1}`);
      }

      setScreen("transition");
    } else if (state.mode === "endless") {
      const stageScore = Math.round(
        (1000 + (1000 / Math.max(1, state.levelTime)) * 100) * state.endlessMultiplier
      );
      state.endlessScore += stageScore;
      state.endlessStage += 1;
      state.endlessMultiplier += state.collisionFree ? 0.5 : 0.2;
      setEndlessScore(state.endlessScore);

          if (state.endlessStage >= 5) {
        tracker.current?.unlock("GAUNTLET_LEGEND");
      }
          if (state.endlessStage >= 10) {
            tracker.current?.unlock("GAUNTLET_MASTER");
          }

      state.status = "transition";
      state.transition = 50;
      setTransitionText(`STAGE ${state.endlessStage} // SCORE +${stageScore}`);
      setScreen("transition");
    } else {
      // Custom test run complete
      state.status = "transition";
      state.transition = 40;
      setTransitionText("CUSTOM SECTOR CLEARED");
      setScreen("transition");
    }
  }

  function advanceTransition() {
    const state = game.current;
    if (state.mode === "campaign") {
      const next = state.levelIndex + 1;
      if (next >= LEVELS.length) {
        state.status = "complete";
        setScreen("complete");
        sound.stopMusic();
        return;
      }
      loadLevel(next);
    } else if (state.mode === "endless") {
      loadLevel(state.levelIndex);
    } else {
      setShowEditor(true);
      setScreen("menu");
    }
  }

  // --- AI TRAP DEPLOYMENT WITH TELEGRAPHS ---

  function scheduleTrap(x, type = "spike", y = 440, width = 44, height = 40, telegraphFrames = 26) {
    const state = game.current;

    // Reject starting spawn zone
    if (x < 150) return false;

    // Strict exit finish box protection: never spawn on or near the exit
    if (state.exit) {
      const exitBuffer = 85;
      if (x + width >= state.exit.x - exitBuffer) return false;
      if (Math.abs(x - state.exit.x) < 95 && Math.abs(y - state.exit.y) < 95) return false;
    }

    // Never spawn directly on player
    if (state.player && Math.abs(x - state.player.x) < 70) return false;

    x = Math.max(20, Math.min(WIDTH - width - 20, x));

    const occupied =
      state.obstacles.some(
        (o) => o.activated && Math.abs(o.x - x) < 45 && Math.abs(o.y - y) < 45
      ) || state.pendingTraps.some((t) => Math.abs(t.x - x) < 45);

    if (occupied) return false;

    particleSys.current.addTelegraph(x, y, width, height, telegraphFrames, type);
    sound.play("telegraph");

    state.pendingTraps.push({
      x,
      y,
      width,
      height,
      type,
      timer: telegraphFrames,
    });

    state.lastAIMsg = "TRAP TARGET LOCKED";
    setAiMessage("TRAP TARGET LOCKED");
    return true;
  }

  function deployPendingTraps(delta) {
    const state = game.current;
    for (let i = state.pendingTraps.length - 1; i >= 0; i--) {
      const t = state.pendingTraps[i];
      t.timer -= delta;
      if (t.timer <= 0) {
        state.trapSerial += 1;
        state.obstacles.push({
          x: t.x,
          y: t.y,
          width: t.width,
          height: t.height,
          type: t.type,
          ai: true,
          activated: true,
          pulse: 1,
          id: `ai-${state.trapSerial}`,
          aiVelocityX: state.levelIndex >= 5 ? (Math.random() < 0.5 ? -2.2 : 2.2) : 0,
        });

        sound.play("ai");
        state.shake = 4 * shakeIntensity;
        state.pendingTraps.splice(i, 1);
      }
    }
  }

  // --- GAME UPDATE LOOP ---

  function update(delta) {
    const state = game.current;
    const player = state.player;
    if (!player) return;

    if (state.status === "dying") {
      state.deathTimer -= delta;
      state.shake *= 0.92;
      particleSys.current.update(delta);
      if (state.deathTimer <= 0) finishDeath();
      return;
    }

    if (state.status === "transition") {
      state.transition -= delta;
      particleSys.current.update(delta);
      if (state.transition <= 0) advanceTransition();
      return;
    }

    if (state.status !== "playing") return;

    pollGamepad();

    const levelData =
      state.mode === "campaign"
        ? LEVELS[state.levelIndex]
        : { mechanics: { hunt: true, prediction: true } };
    const mechanics = levelData?.mechanics || {};
    const levelNo = state.levelIndex + 1;

    state.levelTime += delta / 60;
    state.totalRunTime += delta / 60;
    setLevelTime(state.levelTime);
    setTotalRunTime(state.totalRunTime);

    setDashReady(player.canDash);
    particleSys.current.update(delta);
    state.ghostFrame += delta;
    state.runReplay.push({ x: player.x, y: player.y, scaleX: player.scaleX, scaleY: player.scaleY });

    // Footstep dust when moving on ground
    if (player.grounded && Math.abs(player.velocityX) > 1.2) {
      particleSys.current.addFootstep(
        player.x + player.width / 2,
        player.y + player.height,
        player.facing
      );
    }

    // Swirling portal particles
    if (state.exit && !state.exit.locked) {
      particleSys.current.addPortalParticle(state.exit);
    }

    // Direction changes tracking
    let moveDir = 0;
    if (keys.current.left) moveDir -= 1;
    if (keys.current.right) moveDir += 1;
    if (moveDir && state.lastDirection && moveDir !== state.lastDirection) {
      state.directionChanges += 1;
    }
    if (moveDir) {
      state.lastDirection = moveDir;
      state.movementDirection = moveDir;
      if (moveDir < 0) state.aiMemory.leftMoves += delta;
      else state.aiMemory.rightMoves += delta;
    }

    // Hostile Control Inversion
    if (mechanics.inversion) {
      state.mechanicTimer += delta;
      const every = mechanics.inversionEvery || 260;
      if (!state.controlInverted && state.mechanicTimer >= every) {
        state.controlInverted = true;
        state.inversionTimer = mechanics.inversionDuration || 80;
        state.mechanicTimer = 0;
        state.shake = 7 * shakeIntensity;
        setAiMessage("HOSTILE INVERSION // CONTROLS REVERSED");
        sound.play("inversion");
        announcer.speak("Warning: Hostile Inversion Active");
        particleSys.current.addFloatingText("INVERTED!", WIDTH / 2, 140, "#ff4d3d");
      }
      if (state.controlInverted) {
        state.inversionTimer -= delta;
        if (state.inversionTimer <= 0) {
          state.controlInverted = false;
          state.mechanicTimer = 0;
          setAiMessage("CONTROLS RESTORED");
          particleSys.current.addFloatingText("NORMALIZED", WIDTH / 2, 140, "#7cff6b");
        }
      }
    }

    // Update Moving Platforms
    for (const platform of state.platforms) {
      if (!platform.moving) continue;
      const dist = Math.abs(
        platform.x + platform.width / 2 - (player.x + player.width / 2)
      );
      const boost = mechanics.shifting && dist < 180 ? 1.4 : 1;
      platform.x += platform.speed * boost * platform.direction * delta;

      if (platform.x <= platform.minX) {
        platform.x = platform.minX;
        platform.direction = 1;
      }
      if (platform.x + platform.width >= platform.maxX) {
        platform.x = platform.maxX - platform.width;
        platform.direction = -1;
      }
    }

    for (const rail of state.speedRails) {
      if (checkCollision(player, rail, 2, 2)) {
        player.velocityX = rail.direction * rail.speed;
        particleSys.current.addFootstep(player.x + player.width / 2, player.y + player.height, rail.direction);
      }
    }

    for (const crusher of state.crushers) {
      crusher.timer = (crusher.timer + delta) % crusher.cycle;
      const progress = crusher.timer / crusher.cycle;
      const slam = progress < 0.55 ? Math.sin((progress / 0.55) * Math.PI) : 0;
      crusher.currentY = crusher.y + (crusher.floorY - crusher.y - crusher.height) * slam;
      crusher.active = slam > 0.12;
      if (crusher.active && checkCollision(player, {
        x: crusher.x,
        y: crusher.currentY,
        width: crusher.width,
        height: crusher.height,
      }, 3, 3)) {
        loseLife("HYDRAULIC CRUSHER");
        return;
      }
    }

    for (const drone of state.drones) {
      drone.x += drone.speed * drone.direction * delta;
      if (drone.x <= drone.minX || drone.x + drone.width >= drone.maxX) drone.direction *= -1;
      if (!player.isDashing && checkCollision(player, drone, 4, 3)) {
        loseLife("SURVEILLANCE DRONE");
        return;
      }
    }

    for (const wire of state.tripwires) {
      if (!wire.triggered && !player.isDashing && checkCollision(player, wire, 2, 2)) {
        wire.triggered = true;
        state.obstacles.push({
          x: wire.spikeX,
          y: 440,
          width: 48,
          height: 40,
          type: "spike",
          activated: true,
          tripwire: true,
        });
        sound.play("ai");
        particleSys.current.addFloatingText("TRIPWIRE ARMED", wire.x, wire.y - 10, "#ff4d3d");
      }
    }

    for (const zone of state.aiZones) {
      if (checkCollision(player, zone, 0, 0) && Math.random() < 0.04 * delta) {
        scheduleTrap(player.x + player.width * 2, "spike", 440, 44, 40, 18);
      }
    }

    // Check Wall Slide
    const isSliding = checkWallSlide(player, state.platforms, keys.current);
    if (isSliding) {
      sound.play("wall_slide");
      particleSys.current.addWallSlideSparks(
        player.wallDir > 0 ? player.x + player.width : player.x,
        player.y + player.height / 2,
        player.wallDir
      );
    }

    // Execute Dash
    if (keys.current.dash) {
      if (tryDash(player)) {
        sound.play("dash");
        state.aiMemory.dashes += 1;
        state.shake = 3 * shakeIntensity;
        particleSys.current.addDashGhost(player, SKINS.find((s) => s.id === currentSkin)?.trailColor || "#7cff6b");

        if (player.dashCount >= 10) {
          tracker.current?.unlock("PHASE_DANCER");
        }
      }
    }

    // Execute Jump / Wall Jump
    if (keys.current.up) {
      if (tryJump(player)) {
        if (player.wallLockTimer > 0) {
          sound.play("wall_jump");
          tracker.current?.unlock("WALL_RUNNER");
          particleSys.current.addJumpPuff(player.x + player.width / 2, player.y + player.height / 2);
        } else {
          sound.play("jump");
          particleSys.current.addJumpPuff(player.x + player.width / 2, player.y + player.height);
        }
        state.aiMemory.jumps += 1;
      }
    }

    const prevY = player.y;
    const wasGrounded = player.grounded;

    // Apply Physics
    const gravityInverted = state.gravityZones.some((zone) => checkCollision(player, zone, 0, 0));
    player.gravityInverted = gravityInverted;
    updatePhysics(player, keys.current, delta, state.controlInverted, gravityInverted);

    if (player.isDashing && Math.random() < 0.6) {
      particleSys.current.addDashGhost(player, SKINS.find((s) => s.id === currentSkin)?.trailColor || "#7cff6b");
    }

    // Platform Collisions
    player.grounded = false;
    for (const platform of state.platforms) {
      if (resolvePlatformCollision(player, platform, prevY, gravityInverted)) {
        if (!wasGrounded && player.velocityY >= 0) {
          applyLanding(player, player.velocityY);
          sound.play("land", { velocity: player.velocityY });
          particleSys.current.addLandPuff(
            platform.x,
            platform.y,
            platform.width,
            player.velocityY
          );
        }

        if (platform.fragile) {
          platform.touched = true;
        }

        if (mechanics.shifting && platform.moving) {
          platform.direction *= -1;
          setAiMessage("LANDING DETECTED // PLATFORM SHIFTED");
        }
      }
    }

    // Fragile platforms crumble
    for (const platform of state.platforms) {
      if (platform.fragile && platform.touched) {
        platform.crumbleTimer += delta;
        if (platform.crumbleTimer === Math.floor(platform.crumbleTimer)) {
          sound.play("crumble");
        }
        if (platform.crumbleTimer > (platform.crumbleDelay || 28)) {
          platform.x = -9999;
          platform.width = 0;
          if (player.grounded && player.y + player.height <= platform.y + 4) {
            player.grounded = false;
          }
        }
      }
    }

    player.x = Math.max(0, Math.min(WIDTH - player.width, player.x));

    // Bounce Pads Collision
    for (const pad of state.bouncePads) {
      if (checkCollision(player, pad, 2, 2) && player.velocityY >= 0) {
        player.velocityY = pad.force || -13.5;
        player.grounded = false;
        player.scaleX = 0.72;
        player.scaleY = 1.35;
        pad.pulse = 1;
        sound.play("bounce");
        state.shake = 5 * shakeIntensity;
        particleSys.current.addJumpPuff(pad.x + pad.width / 2, pad.y);
        particleSys.current.addFloatingText("BOOST!", pad.x + pad.width / 2, pad.y - 12, "#56b4f5");
      }
      if (pad.pulse > 0) pad.pulse = Math.max(0, pad.pulse - 0.08 * delta);
    }

    // Mid-air Dash Refill Rings
    for (const ring of state.dashRings) {
      if (ring.active) {
        const ringDist = Math.hypot(
          player.x + player.width / 2 - ring.x,
          player.y + player.height / 2 - ring.y
        );
        if (ringDist < (ring.radius || 14) + player.width / 2) {
          refillDash(player);
          ring.active = false;
          ring.cooldown = 140; // Respawn ring after 2.3s
          sound.play("ring_refill");
          particleSys.current.addDashRingBurst(ring.x, ring.y);
          particleSys.current.addFloatingText("DASH REFILLED!", ring.x, ring.y - 14, "#56b4f5");
        }
      } else {
        ring.cooldown -= delta;
        if (ring.cooldown <= 0) {
          ring.active = true;
        }
      }
    }

    // Cyber Data Cubes Collection
    for (const cube of state.cubes) {
      if (!cube.collected) {
        particleSys.current.addDataCubeSparkle(cube.x + 8, cube.y + 8);
        if (checkCollision(player, { x: cube.x, y: cube.y, width: 16, height: 16 }, 2, 2)) {
          cube.collected = true;
          sound.play("cube_collect");
          particleSys.current.addFloatingText("+1 DATA CUBE", cube.x, cube.y - 12, "#b066ff");

          // Save collected cube ID
          setCollectedCubes((prev) => {
            const nextSet = new Set(prev);
            nextSet.add(cube.id);
            try {
              localStorage.setItem("shift-trap-cubes", JSON.stringify(Array.from(nextSet)));
            } catch {
              // Ignore
            }

            // Check Data Hoarder Achievement
            const sectorCubes = state.cubes.filter((c) => c.collected).length;
            if (sectorCubes === state.cubes.length) {
              tracker.current?.unlock("DATA_HOARDER");
            }
            return nextSet;
          });
        }
      }
    }

    // Sector 07 Core Terminals & Boss Overdrive
    if (mechanics.boss && state.terminals.length > 0) {
      for (const term of state.terminals) {
        if (!term.hacked && checkCollision(player, term, 2, 2)) {
          term.hacked = true;
          sound.play("terminal");
          state.shake = 8 * shakeIntensity;
          particleSys.current.addFloatingText(`${term.label} OFFLINE!`, term.x, term.y - 15, "#7cff6b");

          const remaining = state.terminals.filter((t) => !t.hacked).length;
            if (remaining === 1 && !state.bossOverdrive) {
            // Trigger Overseer Overdrive
            state.bossOverdrive = true;
            announcer.speak("Warning: Overseer Overdrive Engaged. Evacuate.");
            setAiMessage("OVERSEER OVERDRIVE ACTIVATED // PURGING SECTOR");
            state.shake = 12 * shakeIntensity;
          } else if (remaining === 0) {
            state.bossOverdrive = false;
            state.bossLaser.charging = false;
            state.bossLaser.firing = false;
            if (state.exit) state.exit.locked = false;
            announcer.speak("Overseer Firewall Offline. Escape Portal Unlocked.");
            setAiMessage("OVERSEER CORE OFFLINE // ESCAPE PORTAL UNLOCKED!");
            particleSys.current.addFloatingText("PORTAL OPEN!", WIDTH / 2, 160, "#7cff6b");
            sound.play("level");
            if (state.collisionFree) tracker.current?.unlock("SYSTEM_HACKER");
          } else {
            setAiMessage(`CORE COMPROMISED // ${remaining} TERMINAL(S) REMAIN`);
          }
        }
      }

      // Handle Boss Laser Sweeps in Overdrive
      if (state.bossOverdrive) {
        const bl = state.bossLaser;
        bl.timer += delta;

        if (!bl.charging && !bl.firing && bl.timer >= bl.cooldown) {
          bl.charging = true;
          bl.timer = 0;
          // Target near player's current elevation
          bl.y = Math.max(160, Math.min(420, player.y + 10));
          sound.play("telegraph");
        } else if (bl.charging) {
          if (bl.timer >= 45) { // 0.75s charge
            bl.charging = false;
            bl.firing = true;
            bl.timer = 0;
            sound.play("boss_laser");
            state.shake = 6 * shakeIntensity;
          }
        } else if (bl.firing) {
          particleSys.current.addBossLaserSparks(WIDTH / 2 + (Math.random() - 0.5) * 400, bl.y);
          // Check player collision with laser beam (invulnerable during Phase Dash!)
          if (!player.isDashing) {
            const inLaserY = player.y + player.height > bl.y - 6 && player.y < bl.y + 12;
            if (inLaserY) {
              loseLife("OVERSEER DEATH LASER");
              return;
            }
          }

          if (bl.timer >= 30) { // 0.5s laser burst
            bl.firing = false;
            bl.timer = 0;
          }
        }
      }
    }

    // Hidden Spike Proximity Trigger
    for (const obstacle of state.obstacles) {
      if (obstacle.hidden && !obstacle.activated) {
        const dist = Math.abs(player.x + player.width / 2 - (obstacle.x + obstacle.width / 2));
        if (dist < (mechanics.hiddenTrigger || 135)) {
          obstacle.activated = true;
          obstacle.pulse = 1;
          state.shake = 6 * shakeIntensity;
          sound.play("ai");
          setAiMessage("DECOY TRIGGERED // WATCH YOUR STEP");
        }
      }
    }

    // Mobile Hunter Spikes (Sector 06 / Endless)
    if (levelNo >= 6 || mechanics.hunt) {
      for (const obstacle of state.obstacles) {
        if (!obstacle.ai || !obstacle.aiVelocityX) continue;
        obstacle.x += obstacle.aiVelocityX * delta;
        const maxPatrolX = state.exit ? state.exit.x - 90 : WIDTH - 130;
        if (obstacle.x < 150 || obstacle.x > maxPatrolX) {
          obstacle.x = Math.max(150, Math.min(maxPatrolX, obstacle.x));
          obstacle.aiVelocityX *= -1;
        }
      }
    }

    deployPendingTraps(delta);

    // Hazard Collisions
    for (const obstacle of state.obstacles) {
      if (!obstacle.activated) continue;
      if (checkHazardCollision(player, obstacle)) {
        loseLife(
          levelNo >= 5
            ? "PREDICTION SUCCESSFUL"
            : levelNo === 3
            ? "DECOY TRIGGERED"
            : "TRAP TRIGGERED"
        );
        return;
      }
    }

    // Abyss Death
    if (player.y > HEIGHT + 70) {
      loseLife("ROUTE LOST");
      return;
    }

    // Exit Gateway Portal Collision
    if (state.exit && !state.exit.locked && checkCollision(player, state.exit, 6, 6)) {
      completeLevel();
      return;
    }

    // Adaptive AI Trap Deployment
    if (levelNo >= 2 || state.mode === "endless") {
      state.aiTimer += delta;

      const mem = state.aiMemory;
      const balance = Math.abs(mem.leftMoves - mem.rightMoves);
      const oneWay = Math.min(1, balance / 150);
      const jumpPatt = Math.min(1, mem.jumps / 7);
      const timeKnow = Math.min(1, state.levelTime / 20);

      mem.aggression = Math.min(1, oneWay * 0.35 + jumpPatt * 0.35 + timeKnow * 0.3);
      sound.setIntensity(mem.aggression);

      const baseDelay = mechanics.aiDelay || 42;
      const delay = Math.max(12, baseDelay - mem.aggression * 18);
      const maxAI = mechanics.maxAI || 10;

      if (state.aiTimer >= delay && state.obstacles.filter((o) => o.ai).length < maxAI) {
        state.aiTimer = 0;

        let targetX;
        if (state.exit && Math.random() < 0.5) {
          const trapCandidate = chooseBestTrap(
            player,
            state.exit,
            state.platforms,
            state.obstacles,
            mem
          );
          if (trapCandidate && trapCandidate.x) {
            targetX = trapCandidate.x;
          }
        }

        if (!targetX) {
          const speed = 4.8;
          const leadFrames = levelNo >= 5 ? 24 : 16;
          targetX = player.x + state.movementDirection * speed * leadFrames;
        }

        const maxExitSafeX = state.exit ? state.exit.x - 90 : WIDTH - 130;
        targetX = Math.max(150, Math.min(maxExitSafeX, targetX));

        scheduleTrap(targetX, "spike", 440, 44, 40, 24);
      }
    }

    if (Math.floor(state.levelTime * 10) % 6 === 0) {
      setLiveStats({
        obstacleCount: state.obstacles.filter((o) => o.activated).length,
        aggression: Math.round(state.aiMemory.aggression * 100),
        leftMoves: Math.round(state.aiMemory.leftMoves),
        rightMoves: Math.round(state.aiMemory.rightMoves),
        jumps: state.aiMemory.jumps,
        dashes: state.aiMemory.dashes,
        cubesCollected: collectedCubes.size,
      });
    }

    state.shake *= 0.9;
  }

  // --- GAMEPAD POLLING ---

  function pollGamepad() {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0] || gamepads[1];
    if (!gp) {
      if (gamepadConnected) setGamepadConnected(false);
      return;
    }

    if (!gamepadConnected) setGamepadConnected(true);

    const axisX = gp.axes[0] || 0;
    const axisY = gp.axes[1] || 0;
    const dpadLeft = gp.buttons[14]?.pressed;
    const dpadRight = gp.buttons[15]?.pressed;
    const dpadUp = gp.buttons[12]?.pressed;
    const dpadDown = gp.buttons[13]?.pressed;

    keys.current.left = axisX < -0.3 || dpadLeft;
    keys.current.right = axisX > 0.3 || dpadRight;
    keys.current.down = axisY > 0.4 || dpadDown;

    const btnA = gp.buttons[0]?.pressed;
    keys.current.up = btnA || dpadUp;

    const btnDash = gp.buttons[1]?.pressed || gp.buttons[2]?.pressed || gp.buttons[7]?.pressed;
    keys.current.dash = btnDash;

    const btnStart = gp.buttons[9]?.pressed;
    if (btnStart && !prevGamepadButtons.current.start) {
      if (game.current.status === "playing") {
        game.current.status = "paused";
        setScreen("paused");
        sound.play("pause");
      } else if (game.current.status === "paused") {
        game.current.status = "playing";
        setScreen("game");
      }
    }
    prevGamepadButtons.current.start = btnStart;

    const btnSelect = gp.buttons[8]?.pressed;
    if (btnSelect && !prevGamepadButtons.current.select) {
      loadLevel(game.current.levelIndex);
    }
    prevGamepadButtons.current.select = btnSelect;
  }

  // --- DRAWING SYSTEM ---

  function draw(ctx) {
    const state = game.current;
    const playerX = state.player?.x || 0;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.save();

    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }

    // 1. Cybernetic Deep Background with Parallax Skyline
    ctx.fillStyle = "#0c0e12";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Parallax Layer 1: Distant Skyline
    ctx.fillStyle = "rgba(18, 22, 28, 0.75)";
    const p1Offset = (playerX * 0.06) % 180;
    for (let x = -100; x < WIDTH + 200; x += 90) {
      const h = 180 + ((x * 13) % 90);
      ctx.fillRect(x - p1Offset, HEIGHT - h, 70, h);
    }

    // Parallax Layer 2: Mid-ground Towers with Glowing Cyber Windows
    ctx.fillStyle = "rgba(22, 28, 36, 0.85)";
    const p2Offset = (playerX * 0.14) % 140;
    for (let x = -80; x < WIDTH + 180; x += 110) {
      const h = 120 + ((x * 19) % 80);
      ctx.fillRect(x - p2Offset, HEIGHT - h, 85, h);

      // Cyber Window clusters
      ctx.fillStyle = "rgba(86, 180, 245, 0.15)";
      ctx.fillRect(x - p2Offset + 15, HEIGHT - h + 25, 6, 6);
      ctx.fillRect(x - p2Offset + 35, HEIGHT - h + 45, 6, 6);
      ctx.fillStyle = "rgba(22, 28, 36, 0.85)";
    }

    // Threat Aura
    const threatRatio = state.aiMemory.aggression || 0;
    const grad = ctx.createRadialGradient(
      WIDTH / 2,
      HEIGHT / 2,
      50,
      WIDTH / 2,
      HEIGHT / 2,
      WIDTH * 0.7
    );
    grad.addColorStop(0, `rgba(255, 77, 61, ${0.04 + threatRatio * 0.09})`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Grid Lines
    ctx.strokeStyle = "rgba(244, 240, 232, 0.025)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    // Digital rain and distant surveillance drones add motion to the skyline.
    ctx.save();
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(86, 180, 245, 0.18)";
    for (let x = 18; x < WIDTH; x += 34) {
      const offset = (Date.now() * (0.025 + (x % 5) * 0.004) + x * 13) % (HEIGHT + 80);
      ctx.fillText("01", x, offset - 40);
      ctx.fillText("10", x, offset);
    }
    ctx.strokeStyle = "rgba(255, 215, 0, 0.45)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const droneX = (Date.now() * (0.018 + i * 0.006) + i * 330) % (WIDTH + 100) - 50;
      const droneY = 70 + i * 36;
      ctx.beginPath();
      ctx.moveTo(droneX - 9, droneY);
      ctx.lineTo(droneX + 9, droneY);
      ctx.moveTo(droneX, droneY - 4);
      ctx.lineTo(droneX, droneY + 4);
      ctx.stroke();
    }
    ctx.restore();

    for (const zone of state.gravityZones) {
      ctx.save();
      ctx.fillStyle = "rgba(176, 102, 255, 0.12)";
      ctx.strokeStyle = "rgba(176, 102, 255, 0.7)";
      ctx.setLineDash([5, 5]);
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      ctx.fillStyle = "#b066ff";
      ctx.font = "800 9px 'Space Grotesk', sans-serif";
      ctx.fillText("GRAVITY INVERSION", zone.x + 8, zone.y + 16);
      ctx.restore();
    }

    // 2. Overseer Core Boss Visual (Sector 07)
    if (state.levelIndex === 6 && state.mode === "campaign") {
      const overseerX = 500;
      const overseerY = 95;
      const eyeAngle = Math.atan2(
        (state.player?.y || 420) - overseerY,
        (state.player?.x || 50) - overseerX
      );

      ctx.save();
      ctx.strokeStyle = state.bossOverdrive ? "rgba(255, 77, 61, 0.8)" : "rgba(255, 77, 61, 0.35)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(overseerX, overseerY, 55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#15181e";
      ctx.strokeStyle = state.bossOverdrive ? "#ff2a17" : "#ff4d3d";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(overseerX, overseerY, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const pupilDist = 12;
      const pupilX = overseerX + Math.cos(eyeAngle) * pupilDist;
      const pupilY = overseerY + Math.sin(eyeAngle) * pupilDist;

      ctx.fillStyle = state.bossOverdrive ? "#ff2a17" : "#ff4d3d";
      ctx.shadowColor = "#ff4d3d";
      ctx.shadowBlur = state.bossOverdrive ? 24 : 14;
      ctx.beginPath();
      ctx.arc(pupilX, pupilY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#f4f0e8";
      ctx.beginPath();
      ctx.arc(pupilX - 3, pupilY - 3, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#969ba6";
      ctx.font = "800 8px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        state.bossOverdrive ? "OVERSEER // OVERDRIVE ENGAGED" : "OVERSEER CORE v7.0",
        overseerX,
        overseerY + 68
      );

      ctx.restore();

      // Draw Boss Laser in Overdrive
      if (state.bossOverdrive) {
        const bl = state.bossLaser;
        if (bl.charging) {
          ctx.save();
          ctx.strokeStyle = "rgba(255, 77, 61, 0.4)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(0, bl.y);
          ctx.lineTo(WIDTH, bl.y);
          ctx.stroke();
          ctx.fillStyle = "#ff4d3d";
          ctx.font = "800 9px 'Space Grotesk', sans-serif";
          ctx.fillText("! LASER SWEEP !", 120, bl.y - 6);
          ctx.restore();
        } else if (bl.firing) {
          ctx.save();
          ctx.fillStyle = "#ff4d3d";
          ctx.shadowColor = "#ff4d3d";
          ctx.shadowBlur = 18;
          ctx.fillRect(0, bl.y - 4, WIDTH, 8);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, bl.y - 1, WIDTH, 2);
          ctx.restore();
        }
      }
    }

    // 3. Platforms
    for (const platform of state.platforms) {
      if (platform.width <= 0) continue;

      ctx.save();
      ctx.fillStyle = platform.fragile && platform.touched ? "#3e4249" : "#1e2229";
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

      ctx.fillStyle = platform.fragile ? "#ff9e94" : "#f4f0e8";
      ctx.fillRect(platform.x, platform.y, platform.width, 3);

      if (platform.moving) {
        ctx.fillStyle = "#7cff6b";
        ctx.fillRect(platform.x + platform.width / 2 - 8, platform.y + 7, 16, 2);
      }

      if (platform.fragile && platform.touched) {
        ctx.strokeStyle = "rgba(255, 77, 61, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(platform.x + 10, platform.y + 3);
        ctx.lineTo(platform.x + 25, platform.y + 12);
        ctx.lineTo(platform.x + 40, platform.y + 6);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 4. Bounce Pads
    for (const pad of state.bouncePads) {
      ctx.save();
      ctx.fillStyle = "#1e2830";
      ctx.fillRect(pad.x, pad.y, pad.width, pad.height);

      const springOffset = pad.pulse * 3;
      ctx.fillStyle = "#56b4f5";
      ctx.shadowColor = "#56b4f5";
      ctx.shadowBlur = 8;
      ctx.fillRect(pad.x + 2, pad.y + springOffset, pad.width - 4, 3);

      ctx.fillStyle = "#56b4f5";
      ctx.font = "800 8px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("▲", pad.x + pad.width / 2, pad.y + 8);
      ctx.restore();
    }

    // 4b. Speed rails
    for (const rail of state.speedRails) {
      ctx.save();
      ctx.fillStyle = "#172b34";
      ctx.fillRect(rail.x, rail.y, rail.width, rail.height);
      ctx.fillStyle = "#56b4f5";
      ctx.shadowColor = "#56b4f5";
      ctx.shadowBlur = 8;
      for (let x = rail.x + 8; x < rail.x + rail.width - 8; x += 22) {
        ctx.fillRect(x, rail.y + 3, 12, 3);
      }
      ctx.restore();
    }

    // 5. Dash Refill Energy Rings
    for (const ring of state.dashRings) {
      ctx.save();
      const ringAlpha = ring.active ? 1 : 0.25;
      ctx.globalAlpha = ringAlpha;
      ctx.strokeStyle = "#56b4f5";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#56b4f5";
      ctx.shadowBlur = ring.active ? 12 : 2;

      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius || 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#56b4f5";
      ctx.font = "800 9px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚡", ring.x, ring.y + 3);
      ctx.restore();
    }

    // 6. Cyber Data Cubes
    for (const cube of state.cubes) {
      if (!cube.collected) {
        ctx.save();
        const pulse = 1 + 0.1 * Math.sin(Date.now() * 0.008);
        ctx.translate(cube.x + 8, cube.y + 8);
        ctx.scale(pulse, pulse);
        ctx.rotate(Date.now() * 0.002);

        ctx.fillStyle = "#b066ff";
        ctx.shadowColor = "#b066ff";
        ctx.shadowBlur = 10;
        ctx.fillRect(-6, -6, 12, 12);

        ctx.strokeStyle = "#f4f0e8";
        ctx.lineWidth = 1;
        ctx.strokeRect(-4, -4, 8, 8);
        ctx.restore();
      }
    }

    // 7. Sector 07 Core Terminals
    for (const term of state.terminals) {
      ctx.save();
      ctx.fillStyle = term.hacked ? "#1c2c20" : "#2c1c1c";
      ctx.fillRect(term.x, term.y, term.width, term.height);

      ctx.strokeStyle = term.hacked ? "#7cff6b" : "#ff4d3d";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(term.x, term.y, term.width, term.height);

      ctx.fillStyle = term.hacked ? "#7cff6b" : "#ff4d3d";
      ctx.fillRect(term.x + 4, term.y + 6, term.width - 8, 14);

      ctx.font = "800 8px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#101114";
      ctx.fillText(term.label.replace("SYS-", ""), term.x + term.width / 2, term.y + 16);

      ctx.fillStyle = term.hacked ? "#7cff6b" : "#ff4d3d";
      ctx.fillText(term.hacked ? "OFF" : "HACK", term.x + term.width / 2, term.y + 32);
      ctx.restore();
    }

    // 8. Hazards & Spikes
    for (const crusher of state.crushers) {
      ctx.save();
      ctx.fillStyle = crusher.active ? "#ff4d3d" : "#8f332b";
      ctx.shadowColor = "#ff4d3d";
      ctx.shadowBlur = crusher.active ? 12 : 4;
      ctx.fillRect(crusher.x, crusher.currentY || crusher.y, crusher.width, crusher.height);
      ctx.fillStyle = "#f4f0e8";
      ctx.fillRect(crusher.x + 7, (crusher.currentY || crusher.y) + crusher.height - 8, crusher.width - 14, 4);
      ctx.restore();
    }

    for (const drone of state.drones) {
      ctx.save();
      ctx.fillStyle = "#ffd700";
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 9;
      ctx.fillRect(drone.x, drone.y, drone.width, drone.height);
      ctx.fillStyle = "#101114";
      ctx.fillRect(drone.x + 6, drone.y + 6, drone.width - 12, 3);
      ctx.restore();
    }

    for (const wire of state.tripwires) {
      ctx.save();
      ctx.strokeStyle = wire.triggered ? "#ff4d3d" : "rgba(255, 215, 0, 0.75)";
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(wire.x, wire.y);
      ctx.lineTo(wire.x, wire.y + wire.height);
      ctx.stroke();
      ctx.restore();
    }

    for (const obstacle of state.obstacles) {
      if (!obstacle.activated) continue;

      ctx.save();
      ctx.fillStyle = "#ff4d3d";
      ctx.shadowColor = "#ff4d3d";
      ctx.shadowBlur = obstacle.ai ? 8 : 4;

      if (obstacle.type === "spike") {
        ctx.beginPath();
        ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
        ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
        ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#f4f0e8";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y + 5);
        ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height - 2);
        ctx.stroke();
      } else {
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      }

      ctx.restore();
    }

    // 9. Exit Gateway Portal
    if (state.exit) {
      const e = state.exit;
      ctx.save();

      const portalColor = e.locked ? "#ff4d3d" : "#7cff6b";
      ctx.strokeStyle = portalColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = portalColor;
      ctx.shadowBlur = 12;
      ctx.strokeRect(e.x, e.y, e.width, e.height);

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = e.locked ? "rgba(255, 77, 61, 0.45)" : "rgba(124, 255, 107, 0.45)";
      ctx.strokeRect(e.x + 5, e.y + 5, e.width - 10, e.height - 10);
      ctx.setLineDash([]);

      ctx.fillStyle = portalColor;
      ctx.font = "800 10px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(e.locked ? "SEALED" : "EXIT", e.x + e.width / 2, e.y + e.height / 2 + 3);
      ctx.restore();
    }

    // 10. Particles & Telegraphs
    particleSys.current.draw(ctx);

    // 11. Player Character with Skin
    const p = state.player;
    const ghost = state.ghostReplay[Math.floor(state.ghostFrame)]
      || state.ghostReplay[state.ghostReplay.length - 1];
    if (ghost && state.status === "playing") {
      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.strokeStyle = "#56b4f5";
      ctx.shadowColor = "#56b4f5";
      ctx.shadowBlur = 10;
      ctx.strokeRect(ghost.x, ghost.y, p?.width || 28, p?.height || 28);
      ctx.restore();
    }
    if (p && state.status !== "dead") {
      ctx.save();
      const cx = p.x + p.width / 2;
      const cy = p.y + p.height / 2;

      ctx.translate(cx, cy);
      ctx.scale(p.scaleX || 1, p.scaleY || 1);

      const skinObj = SKINS.find((s) => s.id === currentSkin) || SKINS[0];

      if (state.status === "dying") {
        ctx.rotate(state.deathTimer * 0.2);
        const sc = Math.max(0, state.deathTimer / 32);
        ctx.scale(sc, sc);
        ctx.fillStyle = "#ff4d3d";
        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      } else {
        ctx.fillStyle = p.isDashing ? "#ffffff" : skinObj.color;
        ctx.shadowColor = p.isDashing ? "#7cff6b" : skinObj.glowColor;
        ctx.shadowBlur = p.isDashing ? 14 : 8;

        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);

        // Digital Visor Eye
        const eyeX = (p.eyeOffsetX || 0) + (p.facing > 0 ? 3 : -3);
        const eyeY = -4;

        ctx.fillStyle = "#101114";
        ctx.fillRect(eyeX - 4, eyeY, 8, 4);

        ctx.fillStyle = p.isDashing ? "#7cff6b" : skinObj.eyeColor;
        ctx.fillRect(eyeX + (p.facing > 0 ? 1 : -3), eyeY + 1, 2, 2);
      }

      ctx.restore();
    }

    // 12. Control Inversion Banner
    if (state.controlInverted) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 77, 61, 0.08)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.strokeStyle = "#ff4d3d";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(10, 10, WIDTH - 20, HEIGHT - 20);
      ctx.setLineDash([]);

      ctx.fillStyle = "#ff4d3d";
      ctx.font = "800 13px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚠ HOSTILE INVERSION ACTIVE ⚠", WIDTH / 2, 32);
      ctx.restore();
    }

    // 13. Retro CRT Scanlines
    if (crtEnabled) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
      for (let y = 0; y < HEIGHT; y += 3) {
        ctx.fillRect(0, y, WIDTH, 1);
      }
    }

    ctx.restore();
  }

  // --- RAF LOOP ---

  useEffect(() => {
    if (screen !== "game" && screen !== "dying" && screen !== "transition") {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let frame;

    game.current.lastTime = 0;

    function loop(time) {
      const state = game.current;
      if (!state.lastTime) state.lastTime = time;

      let delta = (time - state.lastTime) / 16.67;
      delta = Math.min(delta, 2.2);
      state.lastTime = time;

      update(delta);
      draw(ctx);

      frame = requestAnimationFrame(loop);
    }

    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [screen, crtEnabled, shakeIntensity, currentSkin]);

  // --- KEYBOARD LISTENERS ---

  useEffect(() => {
    function keyDown(e) {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === "Escape" || e.key.toLowerCase() === "p") {
        if (game.current.status === "playing") {
          game.current.status = "paused";
          setScreen("paused");
          sound.play("pause");
        } else if (game.current.status === "paused") {
          game.current.status = "playing";
          setScreen("game");
        }
        return;
      }

      if (e.key.toLowerCase() === "r") {
        loadLevel(game.current.levelIndex);
        return;
      }

      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") keys.current.left = true;
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") keys.current.right = true;
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w" || e.key === " ") keys.current.up = true;
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") keys.current.down = true;
      if (e.key === "Shift" || e.key.toLowerCase() === "z" || e.key.toLowerCase() === "j") {
        keys.current.dash = true;
      }
    }

    function keyUp(e) {
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") keys.current.left = false;
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") keys.current.right = false;
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w" || e.key === " ") keys.current.up = false;
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") keys.current.down = false;
      if (e.key === "Shift" || e.key.toLowerCase() === "z" || e.key.toLowerCase() === "j") {
        keys.current.dash = false;
      }
    }

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, [loadLevel]);

  function pressTouch(key) {
    keys.current[key] = true;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
  }

  function releaseTouch(key) {
    keys.current[key] = false;
  }

  // --- LEVEL EDITOR CLICK HANDLER ---

  function handleEditorCanvasClick(e) {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const clickY = ((e.clientY - rect.top) / rect.height) * HEIGHT;

    // Snap to 20px grid
    const snapX = Math.round(clickX / 20) * 20;
    const snapY = Math.round(clickY / 20) * 20;

    const data = { ...customSectorData };

    if (editorTool === "platform") {
      data.platforms.push({ x: snapX, y: snapY, width: 80, height: 20 });
    } else if (editorTool === "spike") {
      data.obstacles.push({ x: snapX, y: snapY, width: 40, height: 35, type: "spike" });
    } else if (editorTool === "bounce") {
      data.bouncePads.push({ x: snapX, y: snapY, width: 32, height: 8, force: -13.5 });
    } else if (editorTool === "ring") {
      data.dashRings.push({ x: snapX, y: snapY, radius: 14 });
    } else if (editorTool === "cube") {
      data.cubes.push({ id: `c-${Date.now()}`, x: snapX, y: snapY });
    } else if (editorTool === "rail") {
      data.speedRails.push({ x: snapX, y: snapY, width: 120, height: 10, speed: 8, direction: 1 });
    } else if (editorTool === "crusher") {
      data.crushers.push({ id: `crusher-${Date.now()}`, x: snapX, y: 120, width: 48, height: 300, floorY: 440, cycle: 150, phase: 0 });
    } else if (editorTool === "gravity") {
      data.gravityZones.push({ id: `gravity-${Date.now()}`, x: snapX, y: snapY, width: 160, height: 160 });
    } else if (editorTool === "tripwire") {
      data.tripwires.push({ id: `tripwire-${Date.now()}`, x: snapX, y: snapY, width: 3, height: 100, spikeX: snapX - 20 });
    } else if (editorTool === "ai-zone") {
      data.aiZones.push({ id: `ai-zone-${Date.now()}`, x: snapX, y: snapY, width: 160, height: 100 });
    } else if (editorTool === "exit") {
      data.exit = { x: snapX, y: snapY, width: 35, height: 60 };
    } else if (editorTool === "erase") {
      data.platforms = data.platforms.filter((p) => Math.hypot(p.x - snapX, p.y - snapY) > 35);
      data.obstacles = data.obstacles.filter((o) => Math.hypot(o.x - snapX, o.y - snapY) > 35);
      data.bouncePads = data.bouncePads.filter((b) => Math.hypot(b.x - snapX, b.y - snapY) > 35);
      data.dashRings = data.dashRings.filter((r) => Math.hypot(r.x - snapX, r.y - snapY) > 35);
      data.cubes = data.cubes.filter((c) => Math.hypot(c.x - snapX, c.y - snapY) > 35);
      data.speedRails = data.speedRails.filter((r) => Math.hypot(r.x - snapX, r.y - snapY) > 35);
      data.crushers = data.crushers.filter((c) => Math.hypot(c.x - snapX, snapY - c.y) > 55);
      data.gravityZones = data.gravityZones.filter((z) => Math.hypot(z.x - snapX, z.y - snapY) > 55);
      data.tripwires = data.tripwires.filter((t) => Math.abs(t.x - snapX) > 35);
      data.aiZones = data.aiZones.filter((z) => Math.hypot(z.x - snapX, z.y - snapY) > 55);
    }

    setCustomSectorData(data);
    sound.play("click");
  }

  // --- MODALS ---

  const renderToast = () => {
    if (!toastMessage) return null;
    return (
      <div className="achievement-toast">
        <span className="toast-icon">{toastMessage.icon}</span>
        <div>
          <small>ACHIEVEMENT UNLOCKED</small>
          <strong>{toastMessage.title}</strong>
        </div>
      </div>
    );
  };

  const renderSettingsModal = () => {
    if (!showSettings) return null;
    return (
      <div className="settings-backdrop" onClick={() => setShowSettings(false)}>
        <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>SYSTEM CONFIGURATION</h3>
            <button className="close-btn" onClick={() => setShowSettings(false)}>✕</button>
          </div>

          <div className="settings-group">
            <label>AUDIO CHANNELS</label>
            <div className="setting-row">
              <span>MUTE AUDIO</span>
              <button
                className={`toggle-btn ${isMuted ? "active" : ""}`}
                onClick={() => {
                  const m = sound.toggleMute();
                  setIsMuted(m);
                }}
              >
                {isMuted ? "MUTED" : "ENABLED"}
              </button>
            </div>

            <div className="setting-row">
              <span>VOICE ANNOUNCER</span>
              <button
                className={`toggle-btn ${announcerActive ? "active" : ""}`}
                onClick={() => {
                  const a = announcer.toggle();
                  setAnnouncerActive(a);
                }}
              >
                {announcerActive ? "ENABLED" : "MUTED"}
              </button>
            </div>

            <div className="setting-slider">
              <span>MASTER VOLUME ({Math.round(masterVol * 100)}%)</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={masterVol}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setMasterVol(v);
                  sound.setMasterVolume(v);
                }}
              />
            </div>

            <div className="setting-slider">
              <span>SFX VOLUME ({Math.round(sfxVol * 100)}%)</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={sfxVol}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setSfxVol(v);
                  sound.setSfxVolume(v);
                }}
              />
            </div>

            <div className="setting-slider">
              <span>MUSIC SYNTH ({Math.round(musicVol * 100)}%)</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVol}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setMusicVol(v);
                  sound.setMusicVolume(v);
                }}
              />
            </div>
          </div>

          <div className="settings-group">
            <label>VISUAL SENSORS</label>
            <div className="setting-row">
              <span>CRT SCANLINES</span>
              <button
                className={`toggle-btn ${crtEnabled ? "active" : ""}`}
                onClick={() => {
                  const next = !crtEnabled;
                  setCrtEnabled(next);
                  localStorage.setItem("shift-trap-crt", String(next));
                }}
              >
                {crtEnabled ? "ON" : "OFF"}
              </button>
            </div>

            <div className="setting-slider">
              <span>SCREEN SHAKE ({Math.round(shakeIntensity * 100)}%)</span>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.25"
                value={shakeIntensity}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setShakeIntensity(v);
                  localStorage.setItem("shift-trap-shake", String(v));
                }}
              />
            </div>
          </div>

          <button className="primary-button full-width" onClick={() => setShowSettings(false)}>
            SAVE & RESUME
          </button>
        </div>
      </div>
    );
  };

  const renderAchievementsModal = () => {
    if (!showAchievementsModal) return null;
    return (
      <div className="settings-backdrop" onClick={() => setShowAchievementsModal(false)}>
        <div className="settings-modal achievements-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>CYBER PROTOCOL ACHIEVEMENTS</h3>
            <button className="close-btn" onClick={() => setShowAchievementsModal(false)}>✕</button>
          </div>

          <div className="achievements-list">
            {ACHIEVEMENTS.map((ach) => {
              const unlockedState = tracker.current?.isUnlocked(ach.id);
              return (
                <div key={ach.id} className={`achievement-item ${unlockedState ? "unlocked" : "locked"}`}>
                  <span className="ach-icon">{unlockedState ? ach.icon : "🔒"}</span>
                  <div className="ach-info">
                    <strong>{ach.title}</strong>
                    <p>{ach.desc}</p>
                  </div>
                  <span className="ach-status">{unlockedState ? "CLEARED" : "LOCKED"}</span>
                </div>
              );
            })}
          </div>

          <button className="primary-button full-width" onClick={() => setShowAchievementsModal(false)}>
            CLOSE
          </button>
        </div>
      </div>
    );
  };

  const renderSkinsModal = () => {
    if (!showSkinsModal) return null;
    const cleanRunsCount = Object.keys(cleanRuns).length;
    const goldMedalsCount = Object.values(levelMedals).filter((m) => m === "gold").length;
    const cubesCount = collectedCubes.size;

    return (
      <div className="settings-backdrop" onClick={() => setShowSkinsModal(false)}>
        <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>CHASSIS OVERCLOCK SKINS</h3>
            <button className="close-btn" onClick={() => setShowSkinsModal(false)}>✕</button>
          </div>

          <div className="skins-grid">
            {SKINS.map((skin) => {
              let isUnlocked = skin.unlocked;
              if (skin.id === "cyan") isUnlocked = cleanRunsCount >= 2;
              if (skin.id === "void") isUnlocked = cubesCount >= 5;
              if (skin.id === "gold") isUnlocked = goldMedalsCount >= 2;

              return (
                <div
                  key={skin.id}
                  className={`skin-card ${currentSkin === skin.id ? "selected" : ""} ${
                    isUnlocked ? "unlocked" : "locked"
                  }`}
                  onClick={() => {
                    if (isUnlocked) {
                      setCurrentSkin(skin.id);
                      localStorage.setItem("shift-trap-skin", skin.id);
                      sound.play("click");
                    }
                  }}
                >
                  <div
                    className="skin-preview-cube"
                    style={{
                      background: skin.color,
                      boxShadow: `0 0 14px ${skin.glowColor}`,
                    }}
                  >
                    <span style={{ background: skin.eyeColor }} />
                  </div>
                  <strong>{skin.name}</strong>
                  <small>{isUnlocked ? (currentSkin === skin.id ? "EQUIPPED" : "SELECT") : skin.requirement}</small>
                </div>
              );
            })}
          </div>

          <button className="primary-button full-width" onClick={() => setShowSkinsModal(false)}>
            DONE
          </button>
        </div>
      </div>
    );
  };

  const renderLevelEditor = () => {
    if (!showEditor) return null;
    return (
      <div className="settings-backdrop editor-backdrop">
        <div className="editor-shell">
          <div className="editor-topbar">
            <div>
              <h3>SECTOR BUILDER</h3>
              <small>Click to place elements. Wall slide & jump are active!</small>
            </div>

            <div className="editor-tools">
              {["platform", "spike", "bounce", "ring", "cube", "rail", "crusher", "gravity", "tripwire", "ai-zone", "exit", "erase"].map((tool) => (
                <button
                  key={tool}
                  className={`tool-btn ${editorTool === tool ? "active" : ""}`}
                  onClick={() => setEditorTool(tool)}
                >
                  {tool.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="editor-actions">
              <button className="secondary-button" onClick={startCustomPlay}>
                ▶ TEST RUN
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  const json = JSON.stringify(customSectorData);
                  setExportCode(btoa(json));
                  navigator.clipboard?.writeText(btoa(json));
                  sound.play("click");
                }}
              >
                EXPORT CODE
              </button>
              <input
                className="editor-import-input"
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                placeholder="PASTE CODE"
                aria-label="Paste sector code"
              />
              <button
                className="secondary-button"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(atob(importCode.trim()));
                    const required = ["platforms", "obstacles", "bouncePads", "dashRings", "cubes", "speedRails", "crushers", "gravityZones", "tripwires", "drones", "aiZones"];
                    if (!parsed || required.some((key) => !Array.isArray(parsed[key]))) throw new Error("Invalid sector");
                    setCustomSectorData({ ...customSectorData, ...parsed });
                    setExportCode("SECTOR CODE IMPORTED");
                    sound.play("click");
                  } catch {
                    setExportCode("INVALID SECTOR CODE");
                  }
                }}
              >
                IMPORT CODE
              </button>
              <button className="close-btn" onClick={() => setShowEditor(false)}>✕</button>
            </div>
          </div>

          <div className="editor-canvas-wrap">
            <canvas
              width={WIDTH}
              height={HEIGHT}
              className="editor-canvas"
              onClick={handleEditorCanvasClick}
              ref={(c) => {
                if (!c) return;
                const ctx = c.getContext("2d");
                ctx.fillStyle = "#11141a";
                ctx.fillRect(0, 0, WIDTH, HEIGHT);

                // Grid
                ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
                for (let x = 0; x < WIDTH; x += 20) {
                  ctx.beginPath();
                  ctx.moveTo(x, 0);
                  ctx.lineTo(x, HEIGHT);
                  ctx.stroke();
                }
                for (let y = 0; y < HEIGHT; y += 20) {
                  ctx.beginPath();
                  ctx.moveTo(0, y);
                  ctx.lineTo(WIDTH, y);
                  ctx.stroke();
                }

                // Platforms
                ctx.fillStyle = "#1e2229";
                for (const p of customSectorData.platforms) {
                  ctx.fillRect(p.x, p.y, p.width, p.height);
                  ctx.fillStyle = "#f4f0e8";
                  ctx.fillRect(p.x, p.y, p.width, 3);
                  ctx.fillStyle = "#1e2229";
                }

                // Spikes
                ctx.fillStyle = "#ff4d3d";
                for (const s of customSectorData.obstacles) {
                  ctx.beginPath();
                  ctx.moveTo(s.x, s.y + s.height);
                  ctx.lineTo(s.x + s.width / 2, s.y);
                  ctx.lineTo(s.x + s.width, s.y + s.height);
                  ctx.closePath();
                  ctx.fill();
                }

                // Bounce Pads
                ctx.fillStyle = "#56b4f5";
                for (const b of customSectorData.bouncePads) {
                  ctx.fillRect(b.x, b.y, b.width, b.height);
                }

                // Dash Rings
                ctx.strokeStyle = "#56b4f5";
                ctx.lineWidth = 2;
                for (const r of customSectorData.dashRings) {
                  ctx.beginPath();
                  ctx.arc(r.x, r.y, 14, 0, Math.PI * 2);
                  ctx.stroke();
                }

                // Data Cubes
                ctx.fillStyle = "#b066ff";
                for (const c of customSectorData.cubes) {
                  ctx.fillRect(c.x, c.y, 14, 14);
                }

                // Exit
                if (customSectorData.exit) {
                  ctx.strokeStyle = "#7cff6b";
                  ctx.lineWidth = 2;
                  ctx.strokeRect(
                    customSectorData.exit.x,
                    customSectorData.exit.y,
                    customSectorData.exit.width,
                    customSectorData.exit.height
                  );
                }
              }}
            />
          </div>

          {exportCode && (
            <div className="export-banner">
              <span>SECTOR CODE COPIED TO CLIPBOARD!</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 1. MAIN MENU SCREEN
  if (screen === "menu") {
    return (
      <main className="game-shell">
        {renderToast()}
        {renderSettingsModal()}
        {renderAchievementsModal()}
        {renderSkinsModal()}
        {renderLevelEditor()}

        <div className="menu-screen">
          <div className="menu-content">
            <div className="menu-kicker">
              <span className="menu-status-dot" />
              <span>PRECISION CYBER PLATFORMER</span>
              <div className="menu-kicker-actions">
                <button className="gear-btn" onClick={() => setShowAchievementsModal(true)}>
                  🏆 BADGES
                </button>
                <button className="gear-btn" onClick={() => setShowSkinsModal(true)}>
                  🎨 CHASSIS
                </button>
                <button className="gear-btn" onClick={() => setShowSettings(true)}>
                  ⚙ CONFIG
                </button>
              </div>
              <span className="menu-version">v3.0 ULTIMATE</span>
            </div>

            <div className="menu-logo">
              SHIFT<span>//</span>TRAP
            </div>

            <p className="menu-description">
              Wall jump, phase dash, and out-maneuver an adaptive AI that tracks your instincts and predicts your landings.
            </p>

            <div className="menu-action-row">
              <button className="primary-button" onClick={() => startCampaign(0)}>
                <span>START CAMPAIGN</span>
                <span className="button-arrow">→</span>
              </button>

              <button className="secondary-button" onClick={startEndless}>
                <span>SURVIVAL GAUNTLET</span>
                <span className="button-arrow">⚡</span>
              </button>

              <button className="secondary-button" onClick={() => setShowEditor(true)}>
                <span>SECTOR BUILDER</span>
                <span className="button-arrow">🛠️</span>
              </button>
            </div>

            <div className="menu-controls">
              <div className="control-item">
                <span className="control-keys">
                  <kbd>A</kbd><kbd>D</kbd> / <kbd>←</kbd><kbd>→</kbd>
                </span>
                <span>MOVE & WALL SLIDE</span>
              </div>

              <div className="control-item">
                <kbd>W</kbd> / <kbd>↑</kbd> / <kbd>SPACE</kbd>
                <span>JUMP & WALL KICK</span>
              </div>

              <div className="control-item">
                <kbd>SHIFT</kbd> / <kbd>Z</kbd>
                <span>PHASE DASH</span>
              </div>

              <div className="control-item">
                <kbd>R</kbd>
                <span>RESET</span>
              </div>

              {gamepadConnected && (
                <div className="gamepad-badge">🎮 GAMEPAD CONNECTED</div>
              )}
            </div>

            {endlessHighScore > 0 && (
              <div className="endless-banner">
                <span>GAUNTLET BEST SCORE:</span>
                <strong>{endlessHighScore.toLocaleString()} PTS</strong>
              </div>
            )}

            <div className="level-select">
              <div className="select-heading">
                <div>
                  <span className="select-eyebrow">SECTOR ACCESS</span>
                  <strong className="select-title">Campaign Sectors</strong>
                </div>
                <div className="level-summary-pills">
                  <span className="pill">💎 {collectedCubes.size}/21 CUBES</span>
                  <span className="level-count">
                    {String(unlocked).padStart(2, "0")}/{String(LEVELS.length).padStart(2, "0")} OPEN
                  </span>
                </div>
              </div>

              <div className="level-buttons">
                {LEVELS.map((lvl, index) => {
                  const locked = index + 1 > unlocked;
                  const medal = levelMedals[index];
                  const isClean = cleanRuns[index];
                  const cubesFound = (lvl.cubes || []).filter((c) => collectedCubes.has(c.id)).length;

                  return (
                    <button
                      key={lvl.id}
                      disabled={locked}
                      onClick={() => startCampaign(index)}
                      className={
                        locked
                          ? "level-button locked"
                          : index + 1 === unlocked
                          ? "level-button current"
                          : "level-button"
                      }
                    >
                      <div className="level-btn-top">
                        <strong className="level-number">
                          {String(lvl.id).padStart(2, "0")}
                        </strong>
                        {medal && (
                          <span className={`medal-icon ${medal}`}>
                            {medal === "gold" ? "🥇" : medal === "silver" ? "🥈" : "🥉"}
                          </span>
                        )}
                        {isClean && <span className="clean-star" title="Clean Run">★</span>}
                      </div>

                      <span className="level-name">{lvl.name}</span>
                      <div className="level-badges-row">
                        <span className="cubes-mini">💎 {cubesFound}/3</span>
                        <span className="level-state">
                          {locked ? "LOCKED" : index + 1 === unlocked ? "READY" : "OPEN"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 2. PAUSE SCREEN
  if (screen === "paused") {
    return (
      <main className="game-shell">
        {renderToast()}
        {renderSettingsModal()}
        {renderAchievementsModal()}
        {renderSkinsModal()}

        <div className="overlay">
          <div className="overlay-content">
            <p className="eyebrow">TACTICAL HOLD</p>
            <h1>PAUSED.</h1>
            <p>Simulation frozen. Press P or Escape to continue.</p>

            <div className="pause-actions">
              <button
                className="primary-button"
                onClick={() => {
                  game.current.status = "playing";
                  setScreen("game");
                }}
              >
                Continue
              </button>

              <button className="secondary-button" onClick={() => setShowSettings(true)}>
                Config ⚙
              </button>

              <button className="secondary-button" onClick={() => setShowSkinsModal(true)}>
                Chassis 🎨
              </button>

              <button
                className="secondary-button"
                onClick={() => loadLevel(game.current.levelIndex)}
              >
                Restart Sector
              </button>

              <button
                className="secondary-button"
                onClick={() => {
                  sound.stopMusic();
                  setScreen("menu");
                }}
              >
                Exit to Menu
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 3. DEATH SCREEN
  if (screen === "dead") {
    return (
      <main className="game-shell outcome-shell outcome-dead">
        {renderToast()}
        <div className="overlay">
          <div className="overlay-content outcome-panel">
            <div className="outcome-topline">
              <span className="outcome-eyebrow">
                <i /> RUN TERMINATED
              </span>
              <span>
                {game.current.mode === "campaign"
                  ? `SECTOR ${String(levelNumber).padStart(2, "0")} / ${String(LEVELS.length).padStart(2, "0")}`
                  : `STAGE ${levelNumber}`}
              </span>
            </div>

            <h1>
              ROUTE <em>LOST.</em>
            </h1>

            <div className="outcome-signal">
              <span>FAILURE SIGNATURE</span>
              <strong>{deathReason}</strong>
            </div>

            <div className="outcome-stats">
              <div>
                <span>RUN TIME</span>
                <strong>{totalRunTime.toFixed(1)}s</strong>
              </div>
              <div>
                <span>STATUS</span>
                <strong>DEFEATED</strong>
              </div>
            </div>

            <div className="death-buttons">
              <button
                className="primary-button"
                onClick={() => {
                  if (game.current.mode === "campaign") {
                    startCampaign(game.current.levelIndex);
                  } else {
                    startEndless();
                  }
                }}
              >
                <span>Retry Run</span>
                <span className="button-arrow">↻</span>
              </button>

              <button className="secondary-button" onClick={() => setScreen("menu")}>
                Exit to Menu
              </button>
            </div>

            <p className="outcome-hint">
              Press <kbd>R</kbd> to retry instantly
            </p>
          </div>
        </div>
      </main>
    );
  }

  // 4. CAMPAIGN COMPLETE SCREEN
  if (screen === "complete") {
    return (
      <main className="game-shell outcome-shell">
        {renderToast()}
        <div className="overlay">
          <div className="overlay-content outcome-panel victory-panel">
            <p className="eyebrow" style={{ color: "#7cff6b" }}>
              SIMULATION BREACHED
            </p>
            <h1>
              YOU <em>ESCAPED.</em>
            </h1>
            <p>The Overseer Core was destroyed. All security layers collapsed.</p>

            <div className="outcome-stats">
              <div>
                <span>TOTAL TIME</span>
                <strong>{totalRunTime.toFixed(1)}s</strong>
              </div>
              <div>
                <span>CASUALTIES</span>
                <strong>{game.current.totalDeaths}</strong>
              </div>
              <div>
                <span>CUBES FOUND</span>
                <strong>{collectedCubes.size}/21</strong>
              </div>
              <div>
                <span>RATING</span>
                <strong style={{ color: "#7cff6b" }}>
                  {game.current.totalDeaths === 0 ? "S+ RANK" : game.current.totalDeaths < 3 ? "A RANK" : "B RANK"}
                </strong>
              </div>
            </div>

            <div className="death-buttons">
              <button className="primary-button" onClick={() => startCampaign(0)}>
                Play Again
              </button>
              <button className="secondary-button" onClick={startEndless}>
                Enter Gauntlet ⚡
              </button>
              <button className="secondary-button" onClick={() => setScreen("menu")}>
                Main Menu
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 5. ACTIVE GAMEPLAY SCREEN
  const currentLevelObj =
    game.current.mode === "campaign"
      ? LEVELS[levelNumber - 1]
      : { name: `GAUNTLET // STAGE ${levelNumber}` };

  const liveThreat = Math.min(
    100,
    Math.round(
      levelNumber === 1
        ? 10 + liveStats.obstacleCount * 2
        : 22 + (levelNumber - 1) * 11 + liveStats.aggression * 0.45 + liveStats.obstacleCount * 2
    )
  );

  return (
    <main className="game-shell level-command-shell" data-level={levelNumber}>
      {renderToast()}
      {renderSettingsModal()}
      {renderAchievementsModal()}
      {renderSkinsModal()}

      {/* Topbar HUD */}
      <header className="level-command-topbar">
        <div className="command-brand">
          <div className="logo">
            SHIFT<span>//</span>TRAP
          </div>
          <div className="command-subtitle">PRECISION COMBAT SIMULATION</div>
        </div>

        <div className="sector-display">
          <span className="sector-kicker">SECTOR</span>
          <strong>{String(levelNumber).padStart(2, "0")}</strong>
          <span className="sector-name">{currentLevelObj.name}</span>
        </div>

        <div className="run-display">
          <div>
            <span>SECTOR TIME</span>
            <strong>{levelTime.toFixed(1)}s</strong>
          </div>

          <div>
            <span>LIVES</span>
            <strong className="life-readout">
              {"●".repeat(lives)}
              <i>{"○".repeat(Math.max(0, 5 - lives))}</i>
            </strong>
          </div>

          <button className="mini-gear-btn" title="Settings" onClick={() => setShowSettings(true)}>
            ⚙
          </button>
        </div>
      </header>

      {/* Command Center Layout */}
      <section className="level-command-grid">
        {/* Left Sensors Panel */}
        <aside className="level-block level-intel">
          <div className="block-topline">
            <span>01 / SENSORS</span>
            <span
              className={`system-dot ${
                liveThreat > 75 ? "critical" : liveThreat > 45 ? "warn" : "safe"
              }`}
            />
          </div>

          <div className="threat-meter">
            <div className="meter-heading">
              <span>THREAT LEVEL</span>
              <strong>{liveThreat}%</strong>
            </div>
            <div className="meter-track">
              <div
                className={`meter-fill ${
                  liveThreat > 75 ? "critical" : liveThreat > 45 ? "medium" : ""
                }`}
                style={{ width: `${liveThreat}%` }}
              />
            </div>
          </div>

          <div className="dash-meter-card">
            <div className="meter-heading">
              <span>PHASE DASH</span>
              <strong style={{ color: dashReady ? "#7cff6b" : "#969ba6" }}>
                {dashReady ? "READY" : "CHARGING"}
              </strong>
            </div>
            <div className="meter-track">
              <div
                className="meter-fill safe"
                style={{
                  width: dashReady
                    ? "100%"
                    : `${Math.round(
                        (1 - (game.current.player?.dashCooldownTimer || 0) / DASH_COOLDOWN) * 100
                      )}%`,
                }}
              />
            </div>
          </div>

          <div className="ai-message">
            <span className="message-label">AI FEED</span>
            <p>{aiMessage}</p>
          </div>

          <div className="behavior-stats">
            <div className="behavior-title">PLAYER METRICS</div>
            <div className="behavior-grid">
              <span>JUMPS <b>{liveStats.jumps}</b></span>
              <span>DASHES <b>{liveStats.dashes}</b></span>
              <span>CUBES <b>{collectedCubes.size}/21</b></span>
              <span>TRAPS <b>{liveStats.obstacleCount}</b></span>
            </div>
          </div>
        </aside>

        {/* Center Playfield */}
        <section className="level-playfield">
          <div className="playfield-head">
            <span className="live-indicator">
              <i /> LIVE FEED
            </span>
            <span>THREAT INDEX {liveThreat}%</span>
            <span>{gamepadConnected ? "🎮 GAMEPAD" : "⌨ KEYBOARD"}</span>
          </div>

          <div className="canvas-container level-canvas">
            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />

            {transitionText && (
              <div className={`level-transition${transitionReward ? " reward" : ""}`}>
                {transitionText}
              </div>
            )}
          </div>

          <div className="playfield-foot">
            <span>WALL SLIDE + JUMP // SHIFT TO DASH</span>
            <span>
              {game.current.mode === "campaign"
                ? `TARGET: 🥇 ${currentLevelObj.targets?.gold || 6}s`
                : `SCORE: ${endlessScore.toLocaleString()}`}
            </span>
          </div>
        </section>

        {/* Right Objectives Panel */}
        <aside className="level-block level-mission">
          <div className="block-topline">
            <span>02 / OBJECTIVE</span>
            <span>{String(levelNumber).padStart(2, "0")}</span>
          </div>

          <h1>{currentLevelObj.name}</h1>

          {levelNumber === 7 && (
            <div className="boss-terminals-card">
              <span>OVERSEER FIREWALLS</span>
              <div className="terminals-status-grid">
                {game.current.terminals?.map((t) => (
                  <div key={t.id} className={`term-badge ${t.hacked ? "offline" : "armed"}`}>
                    {t.label}: {t.hacked ? "OFF" : "ARMED"}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mission-tip">
            <span>TACTICAL BRIEF</span>
            <p>
              {levelNumber === 1
                ? "Wall slide down walls to soften drops, or Wall Jump to scale gaps. Dash through spikes with [Shift]!"
                : levelNumber === 2
                ? "Grab the mid-air Dash Rings to refresh your Phase Dash instantly!"
                : levelNumber === 3
                ? "Look for hidden Data Cubes on high platforms. Collecting them unlocks Chassis skins."
                : levelNumber === 4
                ? "Inversion will reverse inputs. Use Wall Jumps to stall for time until restored."
                : levelNumber === 5
                ? "Bait the AI's predictive landing traps, then Wall Jump off adjacent platforms to bypass."
                : levelNumber === 6
                ? "Mobile hunter spikes cannot reach high walls. Use Wall Slide and Dash Rings to cross high."
                : "Disable SYS-A, B, and C! In Overdrive Phase, duck or Phase Dash through the Overseer's Death Laser!"}
            </p>
          </div>

          {bestTime && (
            <div className="intel-stat" style={{ marginTop: "auto" }}>
              <span>SECTOR BEST</span>
              <strong>{bestTime.toFixed(1)}s</strong>
            </div>
          )}
        </aside>
      </section>

      {/* Desktop Footer */}
      <footer className="level-command-footer">
        <div className="control-strip">
          <span><kbd>A</kbd><kbd>D</kbd> MOVE</span>
          <span><kbd>W</kbd> JUMP & WALL KICK</span>
          <span><kbd>SHIFT</kbd> DASH</span>
          <span><kbd>R</kbd> RESET</span>
          <span><kbd>P</kbd> PAUSE</span>
        </div>

        <div className="footer-ai">
          AI {aiActive ? "ONLINE" : "STANDBY"}
          <span className={aiActive ? "online" : ""} />
        </div>
      </footer>

      {/* Mobile Touch Controls with Dash Button */}
      <div className="mobile-controls">
        <button
          type="button"
          aria-label="Move left"
          onPointerDown={() => pressTouch("left")}
          onPointerUp={() => releaseTouch("left")}
          onPointerCancel={() => releaseTouch("left")}
          onPointerLeave={() => releaseTouch("left")}
        >
          ←
        </button>

        <button
          type="button"
          aria-label="Drop down"
          onPointerDown={() => pressTouch("down")}
          onPointerUp={() => releaseTouch("down")}
          onPointerCancel={() => releaseTouch("down")}
          onPointerLeave={() => releaseTouch("down")}
        >
          ↓
        </button>

        <button
          type="button"
          aria-label="Phase Dash"
          className={`dash-control ${dashReady ? "ready" : "cooling"}`}
          onPointerDown={() => pressTouch("dash")}
          onPointerUp={() => releaseTouch("dash")}
          onPointerCancel={() => releaseTouch("dash")}
          onPointerLeave={() => releaseTouch("dash")}
        >
          ⚡
        </button>

        <button
          type="button"
          aria-label="Jump / Wall Jump"
          className="jump-control"
          onPointerDown={() => pressTouch("up")}
          onPointerUp={() => releaseTouch("up")}
          onPointerCancel={() => releaseTouch("up")}
          onPointerLeave={() => releaseTouch("up")}
        >
          ↑
        </button>

        <button
          type="button"
          aria-label="Move right"
          onPointerDown={() => pressTouch("right")}
          onPointerUp={() => releaseTouch("right")}
          onPointerCancel={() => releaseTouch("right")}
          onPointerLeave={() => releaseTouch("right")}
        >
          →
        </button>
      </div>
    </main>
  );
}