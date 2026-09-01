export const GRAVITY = 0.55;
export const MOVE_SPEED = 4.5;
export const JUMP_FORCE = -11;
export const MAX_FALL_SPEED = 12;

export function applyGravity(player) {
  player.velocityY += GRAVITY;

  if (player.velocityY > MAX_FALL_SPEED) {
    player.velocityY = MAX_FALL_SPEED;
  }

  player.y += player.velocityY;
}

export function movePlayer(player, keys) {
  if (keys.left) {
    player.x -= MOVE_SPEED;
  }

  if (keys.right) {
    player.x += MOVE_SPEED;
  }
}

export function jump(player) {
  if (player.grounded) {
    player.velocityY = JUMP_FORCE;
    player.grounded = false;
  }
}