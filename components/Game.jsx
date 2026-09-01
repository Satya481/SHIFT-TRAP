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

    // Adaptive AI memory
    aiMemory: {
    deaths: [],
    leftMoves: 0,
    rightMoves: 0,
    jumps: 0,
    repeatedRoute: 0,
    aggression: 0,
    },

    transition: 0,
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

    game.current.player = {
      ...level.player,

      velocityY: 0,

      grounded: false,
    };

    game.current.movementDirection =
      1;

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
      index >= 4
    );

    setScreen("game");

    setTransitionText("");
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

  function loseLife() {
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
        `LEVEL ${
          next + 1
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

  function createAIObstacle(
    player
  ) {
    const state =
      game.current;

    const level =
      state.levelIndex + 1;

    const prediction =
      state.movementDirection *
      (level >= 6
        ? 180
        : 130);

    let x =
      player.x +
      prediction +
      170 +
      Math.random() * 150;

    x = Math.max(
      100,
      Math.min(
        920,
        x
      )
    );

    if (
      Math.abs(
        x - player.x
      ) < 100
    ) {
      return;
    }

    const nearby =
      state.obstacles.some(
        (o) =>
          Math.abs(
            o.x - x
          ) < 65
      );

    if (nearby) {
      return;
    }

    const type =
      Math.random() >
      0.55
        ? "spike"
        : "block";

    state.obstacles.push({
      x,

      y:
        type === "spike"
          ? 440
          : 400,

      width:
        type === "spike"
          ? 40
          : 42,

      height:
        type === "spike"
          ? 40
          : 80,

      type,

      ai: true,

      activated: true,

      pulse: 1,
    });

    sound("ai");
  }

  /*
   * GAME UPDATE
   */

  function update(delta) {
    const state =
      game.current;

    const player =
      state.player;

    if (!player) {
      return;
    }

    /*
     * DYING
     */

    if (
      state.status ===
      "dying"
    ) {
      state.deathTimer -=
        delta;

      state.shake *= 0.9;

      if (
        state.deathTimer <=
        0
      ) {
        finishDeath();
      }

      return;
    }

    /*
     * TRANSITION
     */

    if (
      state.status ===
      "transition"
    ) {
      state.transition -=
        delta;

      if (
        state.transition <=
        0
      ) {
        completeTransition();
      }

      return;
    }

    if (
      state.status !==
      "playing"
    ) {
      return;
    }

    /*
     * TIMER
     */

    state.levelTime +=
      delta / 60;

    /*
     * Update displayed timer
     * without React rendering
     * every frame.
     */

    if (
      Math.floor(
        state.levelTime * 10
      ) %
        3 ===
      0
    ) {
      setLevelTime(
        state.levelTime
      );
    }

        /*
    * MOVEMENT
    */

    if (keys.current.left) {
    player.x -= MOVE_SPEED * delta;
    state.movementDirection = -1;

    state.aiMemory.leftMoves += delta;
    }

    if (keys.current.right) {
    player.x += MOVE_SPEED * delta;
    state.movementDirection = 1;

    state.aiMemory.rightMoves += delta;
    }
    /*
     * FAST DROP
     */

    if (
      keys.current.down &&
      player.velocityY < 5
    ) {
      player.velocityY +=
        0.8 * delta;
    }

    /*
     * JUMP
     */

    if (
      keys.current.up &&
      !state.jumpPressed &&
      player.grounded
    ) {
      player.velocityY =
        JUMP_FORCE;

      player.grounded =
        false;

      state.jumpPressed =
        true;

      sound("jump");
    }

    if (
      !keys.current.up
    ) {
      state.jumpPressed =
        false;
    }

    /*
     * GRAVITY
     */

    player.velocityY +=
      GRAVITY * delta;

    player.velocityY =
      Math.min(
        player.velocityY,
        MAX_FALL
      );

    player.y +=
      player.velocityY *
      delta;

    player.grounded =
      false;

    /*
     * PLATFORMS
     */

    for (
      const platform of
        state.platforms
    ) {
      if (
        platform.moving
      ) {
        platform.x +=
          platform.speed *
          platform.direction *
          delta;

        if (
          platform.x <=
            platform.minX ||
          platform.x +
              platform.width >=
            platform.maxX
        ) {
          platform.direction *=
            -1;
        }
      }

      const horizontal =
        player.x +
          player.width >
          platform.x &&
        player.x <
          platform.x +
            platform.width;

      const previousBottom =
        player.y +
        player.height -
        player.velocityY *
          delta;

      const currentBottom =
        player.y +
        player.height;

      if (
        horizontal &&
        player.velocityY >=
          0 &&
        previousBottom <=
          platform.y &&
        currentBottom >=
          platform.y
      ) {
        player.y =
          platform.y -
          player.height;

        player.velocityY = 0;

        player.grounded =
          true;
      }
    }

    /*
     * WORLD BOUNDS
     */

    player.x =
      Math.max(
        0,
        Math.min(
          WIDTH -
            player.width,
          player.x
        )
      );

    /*
     * HIDDEN TRAPS
     */

    for (
      const obstacle of
        state.obstacles
    ) {
      if (
        obstacle.hidden &&
        !obstacle.activated
      ) {
        const distance =
          Math.abs(
            player.x -
              obstacle.x
          );

        if (
          distance < 130
        ) {
          obstacle.activated =
            true;

          obstacle.pulse =
            1;

          state.shake = 5;

          sound("ai");
        }
      }
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

      if (
        collision(
          player,
          obstacle
        )
      ) {
        loseLife();
        return;
      }
    }

    /*
     * FALL
     */

    if (
      player.y >
      HEIGHT + 80
    ) {
      loseLife();
      return;
    }

    /*
     * EXIT
     */

    if (
      state.exit &&
      collision(
        player,
        state.exit
      )
    ) {
      nextLevel();
      return;
    }

    /*
     * AI
     */

    if (
      state.levelIndex >= 4
    ) {
      state.aiTimer +=
        delta;

      const delay =
        state.levelIndex === 4
          ? 90
          : 55;

      if (
        state.aiTimer >=
          delay &&
        state.obstacles
          .length < 14
      ) {
        state.aiTimer = 0;

        createAIObstacle(
          player
        );
      }
    }

    /*
     * PULSE
     */

    for (
      const obstacle of
        state.obstacles
    ) {
      if (
        obstacle.pulse >
        0
      ) {
        obstacle.pulse -=
          0.05 * delta;

        obstacle.pulse =
          Math.max(
            0,
            obstacle.pulse
          );
      }
    }

    /*
     * SHAKE
     */

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
      ctx.fillStyle =
        "#777d87";

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
              You reached level{" "}
              {levelNumber}.
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

  return (
    <main className="game-shell">
      <header className="game-topbar">
        <div className="logo">
          SHIFT
          <span>//</span>
          TRAP
        </div>

        <div className="level-info">
          LEVEL{" "}
          {String(
            levelNumber
          ).padStart(2, "0")}

          <span>
            {level.name}
          </span>
        </div>

        <div className="run-info">
          <span>
            {levelTime.toFixed(
              1
            )}
            s
          </span>

          <div className="lives">
            {"♥".repeat(lives)}
            {"♡".repeat(
              3 - lives
            )}
          </div>
        </div>
      </header>

      <section className="game-area">
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
          />

          {transitionText && (
            <div className="level-transition">
              {transitionText}
            </div>
          )}
        </div>
      </section>

      <footer className="game-footer">
        <div className="controls">
          <span>
            <kbd>←</kbd>
            <kbd>→</kbd>
            MOVE
          </span>

          <span>
            <kbd>↑</kbd>
            JUMP
          </span>

          <span>
            <kbd>↓</kbd>
            DROP
          </span>

          <span>
            <kbd>P</kbd>
            PAUSE
          </span>
        </div>

        <div
          className={`ai-status ${
            aiActive
              ? "active"
              : ""
          }`}
        >
          <span className="status-dot" />

          AI STATE:{" "}
          {aiActive
            ? "ACTIVE"
            : "STANDBY"}
        </div>
      </footer>

      <div className="mobile-controls">
        <button
          onPointerDown={() =>
            press("left")
          }
          onPointerUp={() =>
            release("left")
          }
          onPointerLeave={() =>
            release("left")
          }
        >
          ←
        </button>

        <button
          onPointerDown={() =>
            press("down")
          }
          onPointerUp={() =>
            release("down")
          }
          onPointerLeave={() =>
            release("down")
          }
        >
          ↓
        </button>

        <button
          className="jump-control"
          onPointerDown={() =>
            press("up")
          }
          onPointerUp={() =>
            release("up")
          }
          onPointerLeave={() =>
            release("up")
          }
        >
          ↑
        </button>

        <button
          onPointerDown={() =>
            press("right")
          }
          onPointerUp={() =>
            release("right")
          }
          onPointerLeave={() =>
            release("right")
          }
        >
          →
        </button>
      </div>
    </main>
  );
}