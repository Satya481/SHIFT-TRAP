// game/physics.js
// Precision platformer physics: Coyote Time, Jump Buffering, Variable Jump Height,
// Phase Dash, Wall Slide, Wall Jump, and Dynamic Squash & Stretch.

export const GRAVITY = 0.56;
export const MAX_FALL_SPEED = 12.5;
export const FAST_FALL_GRAVITY = 0.95;

export const MAX_RUN_SPEED = 4.8;
export const ACCELERATION = 0.9;
export const FRICTION = 0.76;
export const AIR_ACCELERATION = 0.68;
export const AIR_FRICTION = 0.92;

export const JUMP_FORCE = -11.4;
export const JUMP_CUTOFF = 0.58;
export const COYOTE_TIME_MAX = 7; // frames
export const JUMP_BUFFER_MAX = 7; // frames

export const DASH_SPEED = 11.2;
export const DASH_DURATION = 10; // frames
export const DASH_COOLDOWN = 55; // frames

export const WALL_SLIDE_SPEED = 2.2;
export const WALL_JUMP_FORCE_Y = -10.8;
export const WALL_JUMP_FORCE_X = 5.8;
export const WALL_LOCK_MAX = 6; // frames

export function createPlayer(x, y, width = 28, height = 28) {
  return {
    x,
    y,
    width,
    height,
    velocityX: 0,
    velocityY: 0,
    grounded: false,
    wasGrounded: false,
    facing: 1, // 1 = right, -1 = left

    // Wall slide / jump state
    isWallSliding: false,
    wallDir: 0, // -1: wall is to the left, 1: wall is to the right
    wallLockTimer: 0,

    // Juice & animation
    scaleX: 1,
    scaleY: 1,
    eyeOffsetX: 0,
    eyeOffsetY: 0,

    // Timing buffers
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    jumpHeld: false,

    // Dash state
    canDash: true,
    isDashing: false,
    dashTimer: 0,
    dashCooldownTimer: 0,
    dashDirection: 1,

    // Stats
    dashCount: 0,
    wallJumpCount: 0,
  };
}

export function updatePhysics(player, keys, delta, controlInverted = false, gravityInverted = false) {
  if (!player) return;

  const inputMultiplier = controlInverted ? -1 : 1;
  let moveInput = 0;
  if (keys.left) moveInput -= 1;
  if (keys.right) moveInput += 1;
  moveInput *= inputMultiplier;

  // Track facing
  if (moveInput !== 0) {
    player.facing = moveInput > 0 ? 1 : -1;
  }

  // Handle Dash Cooldown
  if (player.dashCooldownTimer > 0) {
    player.dashCooldownTimer -= delta;
    if (player.dashCooldownTimer <= 0) {
      player.canDash = true;
    }
  }

  // Wall jump directional input lock
  if (player.wallLockTimer > 0) {
    player.wallLockTimer -= delta;
  }

  // --- DASH LOGIC ---
  if (player.isDashing) {
    player.dashTimer -= delta;
    player.velocityX = player.dashDirection * DASH_SPEED;
    player.velocityY = 0; // Freeze vertical during dash
    player.scaleX = 1.35;
    player.scaleY = 0.75;

    if (player.dashTimer <= 0) {
      player.isDashing = false;
      player.velocityX = player.dashDirection * MAX_RUN_SPEED;
    }

    player.x += player.velocityX * delta;
    return; // Skip normal movement while dashing
  }

  // --- HORIZONTAL MOVEMENT ---
  const accel = player.grounded ? ACCELERATION : AIR_ACCELERATION;
  const frict = player.grounded ? FRICTION : AIR_FRICTION;

  if (player.wallLockTimer <= 0) {
    if (moveInput !== 0) {
      player.velocityX += moveInput * accel * delta;
      if (Math.abs(player.velocityX) > MAX_RUN_SPEED) {
        player.velocityX = Math.sign(player.velocityX) * MAX_RUN_SPEED;
      }
    } else {
      player.velocityX *= Math.pow(frict, delta);
      if (Math.abs(player.velocityX) < 0.1) player.velocityX = 0;
    }
  } else {
    // Decay during wall lock
    player.velocityX *= Math.pow(AIR_FRICTION, delta);
  }

  player.x += player.velocityX * delta;

  // --- COYOTE TIME & JUMP BUFFER ---
  if (player.grounded) {
    player.coyoteTimer = COYOTE_TIME_MAX;
  } else {
    player.coyoteTimer = Math.max(0, player.coyoteTimer - delta);
  }

  if (keys.up && !player.jumpHeld) {
    player.jumpBufferTimer = JUMP_BUFFER_MAX;
    player.jumpHeld = true;
  }
  if (!keys.up) {
    player.jumpHeld = false;
    // Variable Jump Height: cut velocity if released early
    if (player.velocityY < -2.5) {
      player.velocityY *= JUMP_CUTOFF;
    }
  }

  player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - delta);

  // --- GRAVITY & WALL SLIDE ---
  const gravitySign = gravityInverted ? -1 : 1;
  const grav = keys.down && !gravityInverted && player.velocityY > 0 ? FAST_FALL_GRAVITY : GRAVITY;
  player.velocityY += grav * gravitySign * delta;

  // Clamp fall speed: reduced during wall slide
  const terminalVelocity = player.isWallSliding ? WALL_SLIDE_SPEED : MAX_FALL_SPEED;
  if (!gravityInverted && player.velocityY > terminalVelocity) {
    player.velocityY = terminalVelocity;
  }
  if (gravityInverted && player.velocityY < -terminalVelocity) {
    player.velocityY = -terminalVelocity;
  }

  player.y += player.velocityY * delta;

  // Smooth squash/stretch recovery
  player.scaleX += (1 - player.scaleX) * 0.15 * delta;
  player.scaleY += (1 - player.scaleY) * 0.15 * delta;

  // Eye movement tracking
  const targetEyeX = player.facing * 4;
  player.eyeOffsetX += (targetEyeX - player.eyeOffsetX) * 0.25 * delta;
}

export function checkWallSlide(player, platforms, keys) {
  if (!player || player.grounded || player.isDashing || player.velocityY <= 0) {
    player.isWallSliding = false;
    player.wallDir = 0;
    return false;
  }

  // Check left and right wall contact with solid platforms
  const checkDist = 4;
  let touchingLeft = false;
  let touchingRight = false;

  for (const plat of platforms) {
    if (plat.width <= 0) continue;
    // Vertical overlap with platform side
    const vertOverlap =
      player.y + player.height - 4 > plat.y && player.y + 4 < plat.y + plat.height;

    if (!vertOverlap) continue;

    // Check right side of player touching left edge of platform
    if (
      Math.abs(player.x + player.width - plat.x) <= checkDist &&
      (keys.right || player.velocityX >= 0)
    ) {
      touchingRight = true;
    }

    // Check left side of player touching right edge of platform
    if (
      Math.abs(player.x - (plat.x + plat.width)) <= checkDist &&
      (keys.left || player.velocityX <= 0)
    ) {
      touchingLeft = true;
    }
  }

  if (touchingRight) {
    player.isWallSliding = true;
    player.wallDir = 1;
    return true;
  } else if (touchingLeft) {
    player.isWallSliding = true;
    player.wallDir = -1;
    return true;
  }

  player.isWallSliding = false;
  player.wallDir = 0;
  return false;
}

export function tryWallJump(player) {
  if (!player.isWallSliding || player.wallDir === 0) return false;

  // Leap away from wall
  player.velocityY = WALL_JUMP_FORCE_Y;
  player.velocityX = -player.wallDir * WALL_JUMP_FORCE_X;
  player.facing = -player.wallDir;
  player.wallLockTimer = WALL_LOCK_MAX;
  player.isWallSliding = false;
  player.jumpBufferTimer = 0;
  player.wallJumpCount = (player.wallJumpCount || 0) + 1;

  // Dynamic stretch on wall kick
  player.scaleX = 0.75;
  player.scaleY = 1.35;
  return true;
}

export function tryJump(player) {
  // If wall sliding, prioritize wall jump
  if (player.isWallSliding && player.jumpBufferTimer > 0) {
    return tryWallJump(player);
  }

  if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0) {
    player.velocityY = JUMP_FORCE;
    player.grounded = false;
    player.coyoteTimer = 0;
    player.jumpBufferTimer = 0;

    // Stretch on jump
    player.scaleX = 0.78;
    player.scaleY = 1.28;
    return true;
  }
  return false;
}

export function tryDash(player) {
  if (!player.canDash || player.isDashing) return false;

  player.isDashing = true;
  player.canDash = false;
  player.dashTimer = DASH_DURATION;
  player.dashCooldownTimer = DASH_COOLDOWN;
  player.dashDirection = player.facing || 1;
  player.dashCount = (player.dashCount || 0) + 1;

  // Visual burst deformation
  player.scaleX = 1.4;
  player.scaleY = 0.7;
  return true;
}

export function refillDash(player) {
  if (!player) return;
  player.canDash = true;
  player.dashCooldownTimer = 0;
  // Subtle flash deformation
  player.scaleX = 1.2;
  player.scaleY = 1.2;
}

export function applyLanding(player, impactVelocity) {
  player.grounded = true;
  player.isWallSliding = false;
  player.velocityY = 0;

  // Dynamic squash on landing based on impact
  const squashAmount = Math.min(0.42, impactVelocity * 0.038);
  player.scaleX = 1 + squashAmount * 1.2;
  player.scaleY = 1 - squashAmount;
}