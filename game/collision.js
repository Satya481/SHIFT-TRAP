export function checkCollision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function isStandingOn(player, platform) {
  const horizontal =
    player.x + player.width > platform.x &&
    player.x < platform.x + platform.width;

  const vertical =
    player.y + player.height >= platform.y &&
    player.y + player.height <= platform.y + 15;

  return horizontal && vertical;
}