"use client";

import { useEffect, useRef, useState } from "react";
import { LEVELS } from "@/game/levels";

const WIDTH = 1000;
const HEIGHT = 520;

const GRAVITY = 0.55;
const MOVE_SPEED = 4.5;
const JUMP_FORCE = -11;
const MAX_FALL = 12;

export default function Game() {
  const canvasRef = useRef(null);

  const keys = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
  });

  const audio = useRef(null);

  const game = useRef({
    levelIndex: 0,
    lives: 3,

    status: "menu",

    player: null,
    platforms: [],
    obstacles: [],
    exit: null,

    lastTime: 0,

    jumpPressed: false,

    aiTimer: 0,
    levelTime: 0,

    shake: 0,
    deathTimer: 0,
    movementDirection: 1,
    aiMemory: {
      deaths: [],
      leftMoves: 0,
      rightMoves: 0,
      jumps: 0,
      repeatedRoute: 0,
      aggression: 0,
    },

    transition: 0,
    controlInverted: false,
    inversionTimer: 0,
    mechanicTimer: 0,
    aiMessageTimer: 0,
    lastAIMsg: "SYSTEM ONLINE",
    deathReason: "ROUTE COMPROMISED",
    lastX: 0,
    lastDirection: 0,
    directionChanges: 0,
    patternScore: 0,
    huntTimer: 0,
    trapSerial: 0,
  });

  const [screen, setScreen] =
    useState("menu");

  const [levelNumber, setLevelNumber] =
    useState(1);

  const [lives, setLives] =
    useState(3);

  const [levelTime, setLevelTime] =
    useState(0);

  const [bestTime, setBestTime] =
    useState(null);

  const [unlocked, setUnlocked] =
    useState(1);
  useEffect(() => {
    try {
      const saved =
        localStorage.getItem("shift-trap-unlocked");

      if (saved) {
        setUnlocked(
          Math.max(
            1,
            Math.min(
              LEVELS.length,
              Number(saved)
            )
          )
        );
      }
    } catch {
      // Ignore storage errors.
    }
  }, []);
  const [aiActive, setAiActive] =
    useState(false);

  const [transitionText, setTransitionText] =
    useState("");

  const [aiMessage, setAiMessage] =
    useState("SYSTEM ONLINE");

  /*
   * AUDIO
   */

  function initAudio() {
    try {
      if (!audio.current) {
        audio.current =
          new (window.AudioContext ||
            window.webkitAudioContext)();
      }

      if (
        audio.current.state ===
        "suspended"
      ) {
        audio.current.resume();
      }
    } catch {
      // Audio is optional.
    }
  }

  function sound(type) {
    try {
      initAudio();

      const ctx = audio.current;

      if (!ctx) return;

      const oscillator =
        ctx.createOscillator();

      const gain =
        ctx.createGain();

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      const now =
        ctx.currentTime;

      if (type === "jump") {
        oscillator.frequency.setValueAtTime(
          260,
          now
        );

        oscillator.frequency.exponentialRampToValueAtTime(
          520,
          now + 0.1
        );
      }

      if (type === "death") {
        oscillator.frequency.setValueAtTime(
          180,
          now
        );

        oscillator.frequency.exponentialRampToValueAtTime(
          50,
          now + 0.3
        );
      }

      if (type === "level") {
        oscillator.frequency.setValueAtTime(
          320,
          now
        );

        oscillator.frequency.exponentialRampToValueAtTime(
          700,
          now + 0.2
        );
      }

      if (type === "ai") {
        oscillator.frequency.setValueAtTime(
          700,
          now
        );

        oscillator.frequency.exponentialRampToValueAtTime(
          180,
          now + 0.12
        );
      }

      if (type === "pause") {
        oscillator.frequency.setValueAtTime(
          400,
          now
        );
      }

      gain.gain.setValueAtTime(
        0.06,
        now
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + 0.25
      );

      oscillator.start(now);
      oscillator.stop(now + 0.25);
    } catch {
      // Ignore audio errors.
    }
  }

  /*
   * BEST TIMES
   */

  function getBestTime(index) {
    try {
      const value =
        localStorage.getItem(
          `shift-trap-best-${index}`
        );

      return value
        ? Number(value)
        : null;
    } catch {
      return null;
    }
  }

  function saveBestTime(
    index,
    time
  ) {
    try {
      const previous =
        getBestTime(index);

      if (
        previous === null ||
        time < previous
      ) {
        localStorage.setItem(
          `shift-trap-best-${index}`,
          String(time)
        );

        setBestTime(time);
      }
    } catch {
      // localStorage unavailable.
    }
  }

  /*
   * LEVEL LOADING
   */

  function loadLevel(index) {
    const level =
      LEVELS[index];

    game.current.levelIndex =
      index;

    game.current.status =
      "playing";

    game.current.levelTime =
      0;

    game.current.aiTimer =
      0;

    game.current.jumpPressed =
      false;

    game.current.shake =
      0;

    game.current.deathTimer =
      0;

    game.current.transition =
      0;

    game.current.controlInverted = false;
    game.current.inversionTimer = 0;
    game.current.mechanicTimer = 0;
    game.current.aiMessageTimer = 0;
    game.current.lastAIMsg = "SYSTEM ONLINE";
    game.current.deathReason = "ROUTE COMPROMISED";
    game.current.lastX = level.player.x;
    game.current.lastDirection = 0;
    game.current.directionChanges = 0;
    game.current.patternScore = 0;
    game.current.huntTimer = 0;
    game.current.trapSerial = 0;

    game.current.player = {
      ...level.player,

      velocityY: 0,

      grounded: false,
    };

    game.current.movementDirection =
      1;
    game.current.aiMemory = {
      deaths: [],
      leftMoves: 0,
      rightMoves: 0,
      jumps: 0,
      repeatedRoute: 0,
      aggression: 0,
    };
    game.current.platforms =
      level.platforms.map(
        (platform) => ({
          ...platform,
          direction: 1,
        })
      );

    game.current.obstacles =
      level.obstacles.map(
        (obstacle) => ({
          ...obstacle,

          activated:
            !obstacle.hidden,

          pulse: 0,
        })
      );

    game.current.exit = {
      ...level.exit,
    };

    setLevelNumber(
      index + 1
    );

    setLives(
      game.current.lives
    );

    setLevelTime(0);

    setBestTime(
      getBestTime(index)
    );

    setAiActive(
      index >= 1
    );

    setScreen("game");

    setTransitionText("");
    setAiMessage(
      index === 0
        ? "SYSTEM ONLINE // OBSERVING"
        : index === 1
          ? "PATTERN DETECTION ACTIVE"
          : index === 2
            ? "DECOY LAYER ARMED"
            : index === 3
              ? "ROUTE INVERSION READY"
              : index === 4
                ? "PREDICTION ENGINE LOCKED"
                : "OVERRIDE PROTOCOL ACTIVE"
    );
  }

  /*
   * START
   */

  function startGame() {
    initAudio();

    game.current.lives = 3;

    setLives(3);

    loadLevel(0);
  }

  /*
   * SELECT LEVEL
   */

  function selectLevel(index) {
    if (
      index + 1 >
      unlocked
    ) {
      return;
    }

    initAudio();

    game.current.lives = 3;

    setLives(3);

    loadLevel(index);
  }

  /*
   * DEATH
   */

  function loseLife(reason = "ROUTE COMPROMISED") {
    if (
      game.current.status !==
      "playing"
    ) {
      return;
    }

    game.current.status =
      "dying";

    game.current.deathTimer =
      25;

    game.current.shake =
      14;

    game.current.deathReason = reason;
    setAiMessage(
      reason === "PREDICTION SUCCESSFUL"
        ? "PREDICTION SUCCESSFUL"
        : "ROUTE COMPROMISED"
    );

    sound("death");

    setScreen("dying");
  }

  function finishDeath() {
    const nextLives =
      game.current.lives - 1;

    game.current.lives =
      nextLives;

    setLives(nextLives);

    if (nextLives <= 0) {
      game.current.status =
        "dead";

      setScreen("dead");

      return;
    }

    loadLevel(
      game.current.levelIndex
    );
  }

  /*
   * LEVEL COMPLETE
   */

  function nextLevel() {
    if (
      game.current.status !==
      "playing"
    ) {
      return;
    }

    saveBestTime(
      game.current.levelIndex,
      game.current.levelTime
    );

    const next =
      game.current.levelIndex + 1;

    game.current.status =
      "transition";

    game.current.transition =
      55;

    sound("level");

    /*
     * Unlock next level.
     */

    if (
      next + 1 >
      unlocked
    ) {
      const newUnlocked =
        Math.min(
          LEVELS.length,
          next + 1
        );

      setUnlocked(
        newUnlocked
      );

      try {
        localStorage.setItem(
          "shift-trap-unlocked",
          String(newUnlocked)
        );
      } catch {
        // Ignore.
      }
    }

    if (
      next >=
      LEVELS.length
    ) {
      setTransitionText(
        "RUN COMPLETE"
      );
    } else {
      setTransitionText(
        `LEVEL ${next + 1
        }`
      );
    }

    setScreen(
      "transition"
    );
  }

  function completeTransition() {
    const next =
      game.current.levelIndex + 1;

    if (
      next >=
      LEVELS.length
    ) {
      game.current.status =
        "complete";

      setScreen(
        "complete"
      );

      return;
    }

    loadLevel(next);
  }

  /*
   * RESTART
   */

  function restartLevel() {
    game.current.lives = 3;

    setLives(3);

    loadLevel(
      game.current.levelIndex
    );
  }

  function restartRun() {
    game.current.lives = 3;

    setLives(3);

    loadLevel(0);
  }

  /*
   * COLLISION
   */

  function collision(a, b) {
    return (
      a.x <
      b.x + b.width &&
      a.x + a.width >
      b.x &&
      a.y <
      b.y + b.height &&
      a.y + a.height >
      b.y
    );
  }

  /*
   * AI
   */

  function deployTrap(x, type = "spike", y = 440, width = 44, height = 40) {
    const state = game.current;
    x = Math.max(18, Math.min(WIDTH - width - 18, x));

    const occupied = state.obstacles.some((o) =>
      o.activated && Math.abs(o.x - x) < Math.max(38, width * 0.7) && Math.abs(o.y - y) < 48
    );
    if (occupied) return false;

    state.trapSerial += 1;
    state.obstacles.push({
      x, y, width, height, type,
      ai: true,
      activated: true,
      pulse: 1,
      id: `ai-${state.trapSerial}`,
      aiVelocityX: 0,
    });
    state.lastAIMsg = "TRAP DEPLOYED";
    setAiMessage("TRAP DEPLOYED");
    sound("ai");
    return true;
  }

  function predictedPlayerX(player, frames = 18) {
    const state = game.current;
    const horizontal =
      state.aiMemory.rightMoves - state.aiMemory.leftMoves;
    const dir = state.movementDirection || (horizontal >= 0 ? 1 : -1);
    const speed = MOVE_SPEED * (1 + Math.min(0.45, Math.abs(horizontal) / 600));
    return player.x + dir * speed * frames;
  }

  function createAIObstacle(player, forcedOffset = null) {
    const state = game.current;
    const level = state.levelIndex + 1;
    const m = LEVELS[state.levelIndex].mechanics || {};

    let target = predictedPlayerX(player, level >= 6 ? 26 : level >= 5 ? 22 : 16);
    if (forcedOffset !== null) target = player.x + forcedOffset;

    // Never spawn directly under the player; give the trap a reaction window.
    if (Math.abs(target - player.x) < 95) {
      target += (state.movementDirection || 1) * 110;
    }

    const typeRoll = Math.random();
    let type = "spike";
    let y = 440;
    let width = 44;
    let height = 40;

    if (level >= 5 && typeRoll > 0.68) {
      type = "block";
      y = 360;
      width = 48;
      height = 120;
    }

    const placed = deployTrap(target, type, y, width, height);
    if (!placed) return;

    const trap = state.obstacles[state.obstacles.length - 1];

    if (level >= 6) {
      trap.aiVelocityX = (Math.random() < 0.5 ? -1 : 1) * (1.8 + Math.random() * 2.2);
    }

    if (level === 2) setAiMessage("ROUTE TRACKED // PLATFORM SHIFT");
    if (level === 3) setAiMessage("BAIT ARMED // SAFE PATH FALSE");
    if (level === 4) setAiMessage("PATTERN BROKEN // ROUTE INVERTED");
    if (level === 5) setAiMessage("PREDICTION LOCK // LANDING TARGETED");
    if (level === 6) setAiMessage("HUNT ACTIVE // ESCAPE ROUTE CLOSED");
  }

/*
 * GAME UPDATE
 */

function update(delta) {
  const state = game.current;
  const player = state.player;
  if (!player) return;

  if (state.status === "dying") {
    state.deathTimer -= delta;
    state.shake *= 0.9;
    if (state.deathTimer <= 0) finishDeath();
    return;
  }

  if (state.status === "transition") {
    state.transition -= delta;
    if (state.transition <= 0) completeTransition();
    return;
  }

  if (state.status !== "playing") return;

  const levelIndex = state.levelIndex;
  const level = LEVELS[levelIndex];
  const mechanics = level.mechanics || {};
  const levelNo = levelIndex + 1;

  state.levelTime += delta / 60;
  if (Math.floor(state.levelTime * 10) % 3 === 0) setLevelTime(state.levelTime);
  state.mechanicTimer += delta;

  // Track direction changes. Repetition is exactly what the AI wants.
  let inputDirection = 0;
  if (keys.current.left) inputDirection -= 1;
  if (keys.current.right) inputDirection += 1;
  if (inputDirection && state.lastDirection && inputDirection !== state.lastDirection) {
    state.directionChanges += 1;
  }
  if (inputDirection) state.lastDirection = inputDirection;

  // LEVEL 4+ — hostile control inversion. It starts early and repeats.
  if (mechanics.inversion) {
    const every = mechanics.inversionEvery || 250;
    if (!state.controlInverted && state.mechanicTimer >= every) {
      state.controlInverted = true;
      state.inversionTimer = mechanics.inversionDuration || 80;
      state.mechanicTimer = 0;
      state.shake = 5;
      setAiMessage("CONTROL INVERTED // WRONG INPUT = DEATH");
      sound("ai");
    }
    if (state.controlInverted) {
      state.inversionTimer -= delta;
      if (state.inversionTimer <= 0) {
        state.controlInverted = false;
        state.mechanicTimer = 0;
        setAiMessage("CONTROL RESTORED // AI RECALCULATING");
      }
    }
  }

  // LEVEL 2 / 6 — moving platforms accelerate when approached.
  for (const platform of state.platforms) {
    if (!platform.moving) continue;
    const distance = Math.abs((platform.x + platform.width / 2) - (player.x + player.width / 2));
    const boost = mechanics.shifting && distance < 170 ? 1.45 : 1;
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

  const inputMultiplier = state.controlInverted ? -1 : 1;
  if (keys.current.left) {
    player.x -= MOVE_SPEED * delta * inputMultiplier;
    state.movementDirection = -1 * inputMultiplier;
    state.aiMemory.leftMoves += delta;
  }
  if (keys.current.right) {
    player.x += MOVE_SPEED * delta * inputMultiplier;
    state.movementDirection = 1 * inputMultiplier;
    state.aiMemory.rightMoves += delta;
  }

  if (keys.current.down && player.velocityY < 5) player.velocityY += 0.8 * delta;

  if (keys.current.up && !state.jumpPressed && player.grounded) {
    player.velocityY = JUMP_FORCE;
    player.grounded = false;
    state.jumpPressed = true;
    state.aiMemory.jumps += 1;
    sound("jump");
  }
  if (!keys.current.up) state.jumpPressed = false;

  player.velocityY = Math.min(player.velocityY + GRAVITY * delta, MAX_FALL);
  const previousY = player.y;
  player.y += player.velocityY * delta;
  player.grounded = false;

  // Platform collision. Fragile platforms can disappear after being used.
  for (const platform of state.platforms) {
    const horizontal = player.x + player.width > platform.x && player.x < platform.x + platform.width;
    const previousBottom = previousY + player.height;
    const currentBottom = player.y + player.height;

    if (horizontal && player.velocityY >= 0 && previousBottom <= platform.y && currentBottom >= platform.y) {
      player.y = platform.y - player.height;
      player.velocityY = 0;
      player.grounded = true;
      if (platform.fragile) {
        platform.touched = true;
        platform.crumbleTimer = (platform.crumbleTimer || 0) + delta;
      }
      if (mechanics.shifting && platform.moving) {
        platform.direction *= -1;
        setAiMessage("LANDING DETECTED // PLATFORM SHIFTED");
      }
    }
  }

  // Collapse mechanic: touched platforms become unreliable.
  for (const platform of state.platforms) {
    if (platform.fragile && platform.touched) {
      platform.crumbleTimer = (platform.crumbleTimer || 0) + delta;
      if (platform.crumbleTimer > (platform.crumbleDelay || 26)) {
        platform.x = -9999;
        platform.width = 0;
        if (player.grounded && player.y + player.height <= platform.y + 3) player.grounded = false;
      }
    }
  }

  player.x = Math.max(0, Math.min(WIDTH - player.width, player.x));

  // Hidden traps: Level 1 teaches the player to trust the floor, Level 3 punishes it.
  for (const obstacle of state.obstacles) {
    if (obstacle.hidden && !obstacle.activated) {
      const distance = Math.abs((player.x + player.width / 2) - (obstacle.x + obstacle.width / 2));
      const trigger = mechanics.hiddenTrigger || 120;
      if (distance < trigger) {
        obstacle.activated = true;
        obstacle.pulse = 1;
        state.shake = 6;
        setAiMessage(levelNo === 1 ? "SAFE ROUTE REJECTED" : "DECOY TRIGGERED // TOO LATE");
        sound("ai");
      }
    }
  }

  // AI movement — final level traps hunt horizontally.
  if (levelNo === 6) {
    for (const obstacle of state.obstacles) {
      if (!obstacle.ai || !obstacle.aiVelocityX) continue;
      obstacle.x += obstacle.aiVelocityX * delta;
      if (obstacle.x < 25 || obstacle.x > WIDTH - obstacle.width - 25) obstacle.aiVelocityX *= -1;
    }
  }

  // Collision before AI deployment so a trap cannot be spawned on top of the player.
  for (const obstacle of state.obstacles) {
    if (!obstacle.activated) continue;
    if (collision(player, obstacle)) {
      loseLife(levelNo >= 5 ? "PREDICTION SUCCESSFUL" : levelNo === 3 ? "DECOY TRIGGERED" : "TRAP TRIGGERED");
      return;
    }
  }

  if (player.y > HEIGHT + 80) {
    loseLife("ROUTE LOST");
    return;
  }

  if (state.exit && collision(player, state.exit)) {
    nextLevel();
    return;
  }

  // =========================
  // EXTREME ADAPTIVE AI
  // =========================
  if (levelNo >= 2) {
    state.aiTimer += delta;

    const memory = state.aiMemory;
    const movement = memory.leftMoves + memory.rightMoves;
    const balance = Math.abs(memory.leftMoves - memory.rightMoves);
    const jumps = memory.jumps;
    const directionChanges = state.directionChanges;

    // Predictability rises when the player repeats one direction or jump rhythm.
    const oneWay = Math.min(1, balance / 140);
    const jumpPattern = Math.min(1, jumps / 8);
    const rhythm = Math.min(1, directionChanges / 10);
    const timeKnowledge = Math.min(1, state.levelTime / 18);

    memory.aggression = Math.min(
      1,
      oneWay * 0.35 + jumpPattern * 0.25 + (1 - Math.min(1, rhythm)) * 0.2 + timeKnowledge * 0.2
    );
    state.patternScore = Math.round(memory.aggression * 100);

    const baseDelay = mechanics.aiDelay || 40;
    const delay = Math.max(
      6,
      baseDelay - memory.aggression * (levelNo >= 6 ? 20 : 14)
    );
    const maxAI = mechanics.maxAI || 10;

    if (state.aiTimer >= delay && state.obstacles.filter((o) => o.ai).length < maxAI) {
      state.aiTimer = 0;

      if (levelNo === 2) {
        createAIObstacle(player, state.movementDirection * (125 + Math.random() * 80));
      } else if (levelNo === 3) {
        // Attack the most obvious forward route.
        createAIObstacle(player, Math.max(120, state.movementDirection * (150 + Math.random() * 120)));
      } else if (levelNo === 4) {
        createAIObstacle(player, state.movementDirection * (115 + Math.random() * 110));
        if (memory.aggression > 0.45 && Math.random() < 0.55) createAIObstacle(player, -state.movementDirection * 150);
      } else if (levelNo === 5) {
        // Target where the player is predicted to be after a jump/commitment.
        createAIObstacle(player, predictedPlayerX(player, 24) - player.x);
        if (jumps >= 4 && Math.random() < 0.65) createAIObstacle(player, predictedPlayerX(player, 32) - player.x);
      } else if (levelNo === 6) {
        // Hunt from ahead and behind. This is deliberately oppressive.
        createAIObstacle(player, state.movementDirection * (125 + Math.random() * 100));
        createAIObstacle(player, -state.movementDirection * (150 + Math.random() * 110));
        if (memory.aggression > 0.35) createAIObstacle(player, state.movementDirection * (250 + Math.random() * 120));
        if (state.controlInverted && Math.random() < 0.7) createAIObstacle(player, -state.movementDirection * 240);
      }
    }
  }

  // Prediction warning appears shortly before a targeted trap.
  if (levelNo === 5 && state.aiTimer > 10 && state.aiTimer < 14 && state.aiMemory.jumps >= 2) {
    setAiMessage("PREDICTOR: YOUR LANDING IS MAPPED");
  }

  if (levelNo === 6) {
    state.huntTimer += delta;
    if (state.huntTimer > 180) {
      state.huntTimer = 0;
      setAiMessage("HUNT CYCLE // NO SAFE ROUTE");
      state.shake = 3;
    }
  }

  for (const obstacle of state.obstacles) {
    if (obstacle.pulse > 0) obstacle.pulse = Math.max(0, obstacle.pulse - 0.05 * delta);
  }
  state.shake *= 0.9;
}

/*
 * DRAW
 */

function draw(ctx) {
  const state =
    game.current;

  ctx.clearRect(
    0,
    0,
    WIDTH,
    HEIGHT
  );

  ctx.save();

  if (
    state.shake > 0
  ) {
    ctx.translate(
      (Math.random() -
        0.5) *
      state.shake,

      (Math.random() -
        0.5) *
      state.shake
    );
  }

  /*
   * BACKGROUND
   */

  ctx.fillStyle =
    "#191b21";

  ctx.fillRect(
    0,
    0,
    WIDTH,
    HEIGHT
  );

  /*
   * GRID
   */

  ctx.strokeStyle =
    "rgba(255,255,255,0.035)";

  ctx.lineWidth = 1;

  for (
    let x = 0;
    x <= WIDTH;
    x += 40
  ) {
    ctx.beginPath();

    ctx.moveTo(
      x,
      0
    );

    ctx.lineTo(
      x,
      HEIGHT
    );

    ctx.stroke();
  }

  for (
    let y = 0;
    y <= HEIGHT;
    y += 40
  ) {
    ctx.beginPath();

    ctx.moveTo(
      0,
      y
    );

    ctx.lineTo(
      WIDTH,
      y
    );

    ctx.stroke();
  }

  /*
   * PLATFORMS
   */

  for (
    const platform of
    state.platforms
  ) {
    ctx.fillStyle = platform.fragile && platform.touched ? "#4f545d" : "#777d87";

    ctx.fillRect(
      platform.x,
      platform.y,
      platform.width,
      platform.height
    );

    ctx.fillStyle =
      "#f4f0e8";

    ctx.fillRect(
      platform.x,
      platform.y,
      platform.width,
      3
    );
  }

  /*
   * EXIT
   */

  if (state.exit) {
    const e =
      state.exit;

    ctx.strokeStyle =
      "#7cff6b";

    ctx.lineWidth = 2;

    ctx.strokeRect(
      e.x,
      e.y,
      e.width,
      e.height
    );

    ctx.strokeStyle =
      "rgba(124,255,107,0.4)";

    ctx.setLineDash([
      4,
      4,
    ]);

    ctx.strokeRect(
      e.x + 5,
      e.y + 5,
      e.width - 10,
      e.height - 10
    );

    ctx.setLineDash([]);

    ctx.save();

    ctx.translate(
      e.x +
      e.width / 2,
      e.y +
      e.height / 2
    );

    ctx.rotate(
      Math.PI / 2
    );

    ctx.fillStyle =
      "#7cff6b";

    ctx.font =
      "700 9px Space Grotesk";

    ctx.textAlign =
      "center";

    ctx.fillText(
      "EXIT",
      0,
      3
    );

    ctx.restore();
  }

  /*
   * OBSTACLES
   */

  for (
    const obstacle of
    state.obstacles
  ) {
    if (
      !obstacle.activated
    ) {
      continue;
    }

    ctx.fillStyle =
      "#ff4d3d";

    if (
      obstacle.type ===
      "spike"
    ) {
      ctx.beginPath();

      ctx.moveTo(
        obstacle.x,
        obstacle.y +
        obstacle.height
      );

      ctx.lineTo(
        obstacle.x +
        obstacle.width /
        2,
        obstacle.y
      );

      ctx.lineTo(
        obstacle.x +
        obstacle.width,
        obstacle.y +
        obstacle.height
      );

      ctx.closePath();

      ctx.fill();
    } else {
      ctx.fillRect(
        obstacle.x,
        obstacle.y,
        obstacle.width,
        obstacle.height
      );
    }

    if (obstacle.ai && obstacle.pulse <= 0) {
      ctx.strokeStyle = "rgba(255,77,61,0.22)";
      ctx.lineWidth = 1;
      ctx.strokeRect(obstacle.x - 3, obstacle.y - 3, obstacle.width + 6, obstacle.height + 6);
    }

    if (
      obstacle.pulse >
      0
    ) {
      ctx.strokeStyle =
        "#7cff6b";

      ctx.globalAlpha =
        obstacle.pulse;

      ctx.lineWidth = 2;

      ctx.strokeRect(
        obstacle.x - 8,
        obstacle.y - 8,
        obstacle.width + 16,
        obstacle.height + 16
      );

      ctx.globalAlpha = 1;
    }
  }

  /*
   * LEVEL 4 INVERSION SIGNAL
   */
  if (state.controlInverted) {
    ctx.fillStyle = "rgba(255,77,61,0.06)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = "rgba(255,77,61,0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(12, 12, WIDTH - 24, HEIGHT - 24);
    ctx.setLineDash([]);

    ctx.fillStyle = "#ff4d3d";
    ctx.font = "700 12px Space Grotesk";
    ctx.textAlign = "center";
    ctx.fillText("CONTROL INVERTED", WIDTH / 2, 28);
  }

  /*
   * PLAYER
   */

  const p =
    state.player;

  if (p) {
    ctx.save();

    if (
      state.status ===
      "dying"
    ) {
      ctx.translate(
        p.x +
        p.width / 2,
        p.y +
        p.height / 2
      );

      ctx.rotate(
        state.deathTimer *
        0.15
      );

      const scale =
        Math.max(
          0,
          state.deathTimer /
          25
        );

      ctx.scale(
        scale,
        scale
      );

      ctx.fillStyle =
        "#ff4d3d";

      ctx.fillRect(
        -p.width / 2,
        -p.height / 2,
        p.width,
        p.height
      );
    } else {
      ctx.fillStyle =
        "#f4f0e8";

      ctx.fillRect(
        p.x,
        p.y,
        p.width,
        p.height
      );

      ctx.fillStyle =
        "#101114";

      ctx.fillRect(
        p.x + 5,
        p.y + 6,
        18,
        2
      );

      ctx.fillRect(
        p.x + 19,
        p.y + 5,
        4,
        4
      );
    }

    ctx.restore();
  }

  ctx.restore();
}

/*
 * GAME LOOP
 */

useEffect(() => {
  // Canvas only exists during active gameplay,
  // death animation, and level transition.
  if (
    screen !== "game" &&
    screen !== "dying" &&
    screen !== "transition"
  ) {
    return;
  }

  const canvas = canvasRef.current;

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  let frame;

  // Reset timing whenever the game loop starts again.
  game.current.lastTime = 0;

  function loop(time) {
    const state = game.current;

    if (!state.lastTime) {
      state.lastTime = time;
    }

    let delta =
      (time - state.lastTime) / 16.67;

    // Prevent huge jumps if the tab was inactive.
    delta = Math.min(delta, 2);

    state.lastTime = time;

    update(delta);
    draw(ctx);

    frame = requestAnimationFrame(loop);
  }

  frame = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(frame);
  };
}, [screen]);

/*
 * KEYBOARD
 */

useEffect(() => {
  function keyDown(e) {
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        " ",
      ].includes(e.key)
    ) {
      e.preventDefault();
    }

    if (
      e.key ===
      "Escape" ||
      e.key.toLowerCase() ===
      "p"
    ) {
      if (
        game.current.status ===
        "playing"
      ) {
        game.current.status =
          "paused";

        setScreen("paused");

        sound("pause");
      } else if (
        game.current.status ===
        "paused"
      ) {
        game.current.status =
          "playing";

        setScreen("game");
      }

      return;
    }

    if (
      e.key ===
      "ArrowLeft"
    ) {
      keys.current.left =
        true;
    }

    if (
      e.key ===
      "ArrowRight"
    ) {
      keys.current.right =
        true;
    }

    if (
      e.key ===
      "ArrowUp"
    ) {
      keys.current.up =
        true;
    }

    if (
      e.key ===
      "ArrowDown"
    ) {
      keys.current.down =
        true;
    }

    if (
      e.key.toLowerCase() ===
      "r"
    ) {
      restartLevel();
    }
  }

  function keyUp(e) {
    if (
      e.key ===
      "ArrowLeft"
    ) {
      keys.current.left =
        false;
    }

    if (
      e.key ===
      "ArrowRight"
    ) {
      keys.current.right =
        false;
    }

    if (
      e.key ===
      "ArrowUp"
    ) {
      keys.current.up =
        false;
    }

    if (
      e.key ===
      "ArrowDown"
    ) {
      keys.current.down =
        false;
    }
  }

  window.addEventListener(
    "keydown",
    keyDown
  );

  window.addEventListener(
    "keyup",
    keyUp
  );

  return () => {
    window.removeEventListener(
      "keydown",
      keyDown
    );

    window.removeEventListener(
      "keyup",
      keyUp
    );
  };
}, []);

/*
 * MOBILE
 */

function press(key) {
  initAudio();

  keys.current[key] =
    true;
}

function release(key) {
  keys.current[key] =
    false;
}

/*
 * MENU
 */

if (screen === "menu") {
  return (
    <main className="game-shell">
      <div className="menu-screen">
        <div className="menu-content">
          <div className="menu-logo">
            SHIFT
            <span>//</span>
            TRAP
          </div>

          <p className="menu-description">
            The level changes when
            you think you've
            figured it out.
          </p>

          <button
            className="primary-button"
            onClick={
              startGame
            }
          >
            Start run
          </button>

          <div className="menu-controls">
            <div>
              <kbd>←</kbd>
              <kbd>→</kbd>
              Move
            </div>

            <div>
              <kbd>↑</kbd>
              Jump
            </div>

            <div>
              <kbd>R</kbd>
              Restart
            </div>

            <div>
              <kbd>P</kbd>
              Pause
            </div>
          </div>

          <div className="level-select">
            <div className="select-title">
              Levels
            </div>

            <div className="level-buttons">
              {LEVELS.map(
                (level, index) => {
                  const locked =
                    index + 1 >
                    unlocked;

                  return (
                    <button
                      key={
                        level.id
                      }
                      disabled={
                        locked
                      }
                      onClick={() =>
                        selectLevel(
                          index
                        )
                      }
                      className={
                        locked
                          ? "level-button locked"
                          : "level-button"
                      }
                    >
                      <strong>
                        {String(
                          level.id
                        ).padStart(
                          2,
                          "0"
                        )}
                      </strong>

                      <span>
                        {locked
                          ? "LOCKED"
                          : level.name}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/*
 * PAUSE
 */

if (screen === "paused") {
  return (
    <main className="game-shell">
      <div className="overlay">
        <div className="overlay-content">
          <p className="eyebrow">
            GAME PAUSED
          </p>

          <h1>
            HOLD.
          </h1>

          <p>
            Press P or Escape
            to continue.
          </p>

          <button
            className="primary-button"
            onClick={() => {
              game.current.status =
                "playing";

              setScreen("game");
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}

/*
 * DEATH
 */

if (
  screen === "dead"
) {
  return (
    <main className="game-shell">
      <div className="overlay">
        <div className="overlay-content">
          <p className="eyebrow">
            RUN TERMINATED
          </p>

          <h1>
            TRY AGAIN.
          </h1>

          <p>
            {game.current.deathReason || "ROUTE COMPROMISED"}
            <br />
            You reached level {levelNumber}.
          </p>

          <button
            className="primary-button"
            onClick={
              restartLevel
            }
          >
            Retry level
          </button>
        </div>
      </div>
    </main>
  );
}

/*
 * COMPLETE
 */

if (
  screen ===
  "complete"
) {
  return (
    <main className="game-shell">
      <div className="overlay">
        <div className="overlay-content">
          <p className="eyebrow">
            ALL LEVELS CLEARED
          </p>

          <h1>
            YOU ESCAPED.
          </h1>

          <p>
            The system ran out
            of ways to stop you.
          </p>

          <button
            className="primary-button"
            onClick={
              restartRun
            }
          >
            Play again
          </button>
        </div>
      </div>
    </main>
  );
}

/*
 * GAME
 */

const level =
  LEVELS[
  levelNumber - 1
  ];

const levelUI = [
  {
    phase: "BOOT / LEARN",
    system: "DORMANT",
    systemClass: "safe",
    threat: "LOW",
    threatClass: "low",
    objective: "Reach the exit",
    rule: "The system is watching.",
    ai: "No active traps. Learn the movement rhythm.",
    hazard: "STATIC SPIKES",
    signal: "TRAINING",
    briefing:
      "Nothing is random yet. Use this sector to learn the jump timing before the system starts adapting.",
    tip: "The floor is lying. Learn the trap timing without trusting the obvious route.",
  },
  {
    phase: "SHIFT / TRACK",
    system: "TRACKING",
    systemClass: "warn",
    threat: "MEDIUM",
    threatClass: "medium",
    objective: "Cross moving routes",
    rule: "Your movement creates a response.",
    ai: "The AI tracks direction and attacks the route you commit to.",
    hazard: "MOVING PLATFORMS",
    signal: "ADAPTIVE",
    briefing:
      "The level has started reading you. Repeating the same approach makes the next trap easier to predict.",
    tip: "Commit late. Moving platforms change faster when you approach them.",
  },
  {
    phase: "BAIT / DECEPTION",
    system: "DECOY",
    systemClass: "danger",
    threat: "HIGH",
    threatClass: "high",
    objective: "Survive hidden traps",
    rule: "Safe-looking space may be armed.",
    ai: "The obvious route is bait; hidden traps arm when you get close.",
    hazard: "HIDDEN SPIKES",
    signal: "DECEPTION",
    briefing:
      "The obvious route is bait. Watch the floor, vary your timing, and never trust an empty corridor.",
    tip: "Assume the obvious path is bait. Delay your jump until the trap reveals itself.",
  },
  {
    phase: "REVERSE / INVERT",
    system: "INVERSION",
    systemClass: "danger",
    threat: "SEVERE",
    threatClass: "severe",
    objective: "Break the expected route",
    rule: "The AI predicts your next decision.",
    ai: "Controls invert, traps arrive from both sides, and habits are punished.",
    hazard: "ROUTE TRAPS",
    signal: "HOSTILE",
    briefing:
      "You are no longer solving the level. You are solving the prediction model. Break your own habits.",
    tip: "Expect inversion. Break your rhythm before the AI gets a clean prediction.",
  },
  {
    phase: "PREDICT / HUNT",
    system: "PREDICTIVE",
    systemClass: "critical",
    threat: "CRITICAL",
    threatClass: "critical",
    objective: "Outthink the predictor",
    rule: "Your habits are now the enemy.",
    ai: "The predictor targets your likely landing position and jump rhythm.",
    hazard: "PREDICTIVE TRAPS",
    signal: "HUNTING",
    briefing:
      "Every repeated move feeds the prediction engine. False starts and route changes are now survival tools.",
    tip: "Your landing is the target. Change jump timing and direction constantly.",
  },
  {
    phase: "ESCAPE / OVERRIDE",
    system: "OVERRIDE",
    systemClass: "critical",
    threat: "MAXIMUM",
    threatClass: "maximum",
    objective: "Escape the system",
    rule: "Everything is hostile.",
    ai: "HUNT MODE: traps predict, chase, surround and move. No safe route stays safe.",
    hazard: "FULL SYSTEM",
    signal: "LOCKDOWN",
    briefing:
      "This is the final sector. Stop playing the route the system expects and force an opening.",
    tip: "There is no permanent safe side. Switch rhythm, survive the inversion, keep moving.",
  },
][levelNumber - 1];

const liveState = game.current;
const liveObstacleCount =
  liveState.obstacles?.filter(
    (obstacle) => obstacle.activated
  ).length || 0;

const liveAggression = Math.round(
  (liveState.aiMemory?.aggression || 0) * 100
);

const liveThreat = Math.min(
  100,
  Math.round(
    levelNumber === 1
      ? 8 + liveObstacleCount * 2
      : 18 +
          (levelNumber - 1) * 12 +
          liveAggression * 0.45 +
          liveObstacleCount * 2
  )
);

return (
  <main
    className="game-shell level-command-shell"
    data-level={levelNumber}
  >
    <header className="level-command-topbar">
      <div className="command-brand">
        <div className="logo">
          SHIFT<span>//</span>TRAP
        </div>
        <div className="command-subtitle">
          ADAPTIVE SURVIVAL SYSTEM
        </div>
      </div>

      <div className="sector-display">
        <span className="sector-kicker">
          SECTOR
        </span>
        <strong>
          {String(levelNumber).padStart(2, "0")}
        </strong>
        <span className="sector-name">
          {level.name}
        </span>
      </div>

      <div className="run-display">
        <div>
          <span>TIME</span>
          <strong>
            {levelTime.toFixed(1)}s
          </strong>
        </div>

        <div>
          <span>RUNS</span>
          <strong className="life-readout">
            {"●".repeat(lives)}
            <i>
              {"○".repeat(3 - lives)}
            </i>
          </strong>
        </div>
      </div>
    </header>

    <section className="level-command-grid">
      <aside className="level-block level-intel">
        <div className="block-topline">
          <span>01 / SYSTEM</span>
          <span className={`system-dot ${levelUI.systemClass}`} />
        </div>

        <div className="level-phase">
          {levelUI.phase}
        </div>

        <div className="system-state">
          <span>SYSTEM STATE</span>
          <strong className={levelUI.systemClass}>
            {levelUI.system}
          </strong>
        </div>

        <div className="threat-meter">
          <div className="meter-heading">
            <span>THREAT INDEX</span>
            <strong>{liveThreat}%</strong>
          </div>
          <div className="meter-track">
            <div
              className={`meter-fill ${levelUI.threatClass}`}
              style={{
                width: `${liveThreat}%`,
              }}
            />
          </div>
        </div>

        <div className="intel-stat">
          <span>ACTIVE HAZARD</span>
          <strong>{levelUI.hazard}</strong>
        </div>

        <div className="intel-stat">
          <span>TRAPS DEPLOYED</span>
          <strong>
            {String(liveObstacleCount).padStart(2, "0")}
          </strong>
        </div>

        <div className="ai-message">
          <span className="message-label">
            AI FEED
          </span>
          <p>{aiMessage}</p>
          <small>{levelUI.ai}</small>
        </div>

        <div className="behavior-stats">
          <div className="behavior-title">PLAYER PATTERN</div>
          <div className="behavior-grid">
            <span>LEFT <b>{Math.round(liveState.aiMemory?.leftMoves || 0)}</b></span>
            <span>RIGHT <b>{Math.round(liveState.aiMemory?.rightMoves || 0)}</b></span>
            <span>JUMPS <b>{liveState.aiMemory?.jumps || 0}</b></span>
            <span>AGGRESSION <b>{liveAggression}%</b></span>
          </div>
        </div>
      </aside>

      <section className="level-playfield">
        <div className="playfield-head">
          <span className="live-indicator">
            <i />
            LIVE
          </span>
          <span>
            {levelUI.signal}
          </span>
          <span>
            THREAT {liveThreat}%
          </span>
        </div>

        <div className="canvas-container level-canvas">
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
          />

          <div className="canvas-objective">
            <span>OBJECTIVE</span>
            <strong>{levelUI.objective}</strong>
          </div>

          {transitionText && (
            <div className="level-transition">
              {transitionText}
            </div>
          )}
        </div>

        <div className="playfield-foot">
          <span>{levelUI.rule}</span>
          <span>
            ROUTE {levelNumber}/6
          </span>
        </div>
      </section>

      <aside className="level-block level-mission">
        <div className="block-topline">
          <span>02 / MISSION</span>
          <span>
            {String(levelNumber).padStart(2, "0")}/06
          </span>
        </div>

        <div className="mission-index">
          0{levelNumber}
        </div>

        <h1>{level.name}</h1>

        <p className="mission-brief">
          {levelUI.briefing}
        </p>

        <div className="mission-objective">
          <span>PRIMARY OBJECTIVE</span>
          <strong>{levelUI.objective}</strong>
        </div>

        <div className="mission-tip">
          <span>ADAPTATION TIP</span>
          <p>{levelUI.tip}</p>
        </div>

        <div className="level-progress">
          {LEVELS.map((item, index) => (
            <div
              key={item.id}
              className={`progress-node ${
                index + 1 < levelNumber
                  ? "done"
                  : index + 1 === levelNumber
                    ? "current"
                    : ""
              }`}
            >
              <span>
                {String(item.id).padStart(2, "0")}
              </span>
              <small>{item.name}</small>
            </div>
          ))}
        </div>
      </aside>
    </section>

    <footer className="level-command-footer">
      <div className="control-strip">
        <span>
          <kbd>←</kbd><kbd>→</kbd> MOVE
        </span>
        <span>
          <kbd>↑</kbd> JUMP
        </span>
        <span>
          <kbd>↓</kbd> DROP
        </span>
        <span>
          <kbd>R</kbd> RESET
        </span>
        <span>
          <kbd>P</kbd> PAUSE
        </span>
      </div>

      <div className="footer-ai">
        AI {aiActive ? "ONLINE" : "STANDBY"}
        <span className={aiActive ? "online" : ""} />
      </div>
    </footer>

    <div className="mobile-controls">
      <button
        onPointerDown={() => press("left")}
        onPointerUp={() => release("left")}
        onPointerLeave={() => release("left")}
      >
        ←
      </button>

      <button
        onPointerDown={() => press("down")}
        onPointerUp={() => release("down")}
        onPointerLeave={() => release("down")}
      >
        ↓
      </button>

      <button
        className="jump-control"
        onPointerDown={() => press("up")}
        onPointerUp={() => release("up")}
        onPointerLeave={() => release("up")}
      >
        ↑
      </button>

      <button
        onPointerDown={() => press("right")}
        onPointerUp={() => release("right")}
        onPointerLeave={() => release("right")}
      >
        →
      </button>
    </div>
  </main>
);
}