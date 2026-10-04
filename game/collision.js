// game/collision.js
// Precise collision detection with hitbox forgiveness and platform interaction.

export function checkCollision(a, b, insetA = 0, insetB = 0) {
  return (
    a.x + insetA < b.x + b.width - insetB &&
    a.x + a.width - insetA > b.x + insetB &&
    a.y + insetA < b.y + b.height - insetB &&
    a.y + a.height - insetA > b.y + insetB
  );
}

// Lenient hazard check: gives 4px forgiveness on spikes so narrow dodges succeed
export function checkHazardCollision(player, obstacle) {
  if (!obstacle.activated) return false;

  // Invulnerable during Phase Dash
  if (player.isDashing) return false;

  if (obstacle.type === "spike") {
    // Spikes are triangular: check narrower top zone and slightly smaller base
    return (
      player.x + 5 < obstacle.x + obstacle.width - 5 &&
      player.x + player.width - 5 > obstacle.x + 5 &&
      player.y + 4 < obstacle.y + obstacle.height &&
      player.y + player.height - 3 > obstacle.y + 6
    );
  }

  if (obstacle.type === "laser") {
    // Active laser beam
    if (!obstacle.firing) return false;
    return checkCollision(player, obstacle, 3, 2);
  }

  // Generic solid / block obstacle
  return checkCollision(player, obstacle, 4, 3);
}

export function resolvePlatformCollision(player, platform, previousY, gravityInverted = false) {
  const horizontal =
    player.x + player.width - 3 > platform.x &&
    player.x + 3 < platform.x + platform.width;

  if (!horizontal) return false;

  const prevBottom = previousY + player.height;
  const currentBottom = player.y + player.height;

  if (!gravityInverted) {
    if (
      player.velocityY >= 0 &&
      prevBottom <= platform.y + 6 &&
      currentBottom >= platform.y - 1
    ) {
      player.y = platform.y - player.height;
      return true;
    }
  } else {
    const prevTop = previousY;
    const currentTop = player.y;
    if (
      player.velocityY <= 0 &&
      prevTop >= platform.y + platform.height - 6 &&
      currentTop <= platform.y + platform.height + 1
    ) {
      player.y = platform.y + platform.height;
      return true;
    }
  }

  return false;
}