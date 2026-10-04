export function generateAIObstacle(
  player,
  level,
  existingObstacles,
  time
) {
  if (level < 5) return null;

  const difficulty = level === 5 ? 0.012 : 0.018;

  if (Math.random() > difficulty) {
    return null;
  }

  const distanceAhead = 180 + Math.random() * 260;

  const x = Math.min(
    player.x + distanceAhead,
    840
  );

  const types = [
    "spike",
    "block",
    "wall",
  ];

  const type =
    types[Math.floor(Math.random() * types.length)];

  let obstacle;

  if (type === "spike") {
    obstacle = {
      x,
      y: 440,
      width: 35,
      height: 40,
      type: "spike",
      ai: true,
      createdAt: time,
    };
  }

  if (type === "block") {
    obstacle = {
      x,
      y: 390,
      width: 45,
      height: 90,
      type: "block",
      ai: true,
      createdAt: time,
    };
  }

  if (type === "wall") {
    obstacle = {
      x,
      y: 300,
      width: 30,
      height: 180,
      type: "wall",
      ai: true,
      createdAt: time,
    };
  }

  if (!obstacle) return null;

  const overlaps = existingObstacles.some((item) =>
    Math.abs(item.x - obstacle.x) < 60
  );

  if (overlaps) {
    return null;
  }

  return obstacle;
}