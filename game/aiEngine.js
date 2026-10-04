// game/aiEngine.js

const CELL = 40;
const GRID_W = 25;
const GRID_H = 13;

function cellKey(x, y) {
  return `${x},${y}`;
}

function toCell(x) {
  return Math.floor(x / CELL);
}

function toWorld(x) {
  return x * CELL;
}

function blockedCell(cx, cy, platforms, obstacles) {
  if (
    cx < 0 ||
    cx >= GRID_W ||
    cy < 0 ||
    cy >= GRID_H
  ) {
    return true;
  }

  const x = toWorld(cx);
  const y = toWorld(cy);

  const platformBlocked = platforms.some((p) => {
    return (
      x + CELL > p.x &&
      x < p.x + p.width &&
      y + CELL > p.y &&
      y < p.y + p.height
    );
  });

  const obstacleBlocked = obstacles.some((o) => {
    return (
      x + CELL > o.x &&
      x < o.x + o.width &&
      y + CELL > o.y &&
      y < o.y + o.height
    );
  });

  return platformBlocked || obstacleBlocked;
}

function heuristic(a, b) {
  return (
    Math.abs(a.x - b.x) +
    Math.abs(a.y - b.y)
  );
}

function reconstruct(cameFrom, current) {
  const path = [current];

  let key = cellKey(
    current.x,
    current.y
  );

  while (cameFrom[key]) {
    current = cameFrom[key];

    path.push(current);

    key = cellKey(
      current.x,
      current.y
    );
  }

  return path.reverse();
}

export function findPlayerPath(
  player,
  exit,
  platforms,
  obstacles
) {
  const start = {
    x: Math.max(
      0,
      Math.min(
        GRID_W - 1,
        toCell(player.x)
      )
    ),

    y: Math.max(
      0,
      Math.min(
        GRID_H - 1,
        toCell(player.y)
      )
    ),
  };

  const goal = {
    x: Math.max(
      0,
      Math.min(
        GRID_W - 1,
        toCell(exit.x)
      )
    ),

    y: Math.max(
      0,
      Math.min(
        GRID_H - 1,
        toCell(exit.y)
      )
    ),
  };

  const open = [start];

  const cameFrom = {};

  const gScore = {
    [cellKey(start.x, start.y)]: 0,
  };

  const fScore = {
    [cellKey(start.x, start.y)]:
      heuristic(start, goal),
  };

  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  let safety = 0;

  while (
    open.length &&
    safety < 500
  ) {
    safety++;

    open.sort(
      (a, b) =>
        (fScore[
          cellKey(a.x, a.y)
        ] ?? Infinity) -
        (fScore[
          cellKey(b.x, b.y)
        ] ?? Infinity)
    );

    const current = open.shift();

    if (
      current.x === goal.x &&
      current.y === goal.y
    ) {
      return reconstruct(
        cameFrom,
        current
      );
    }

    for (const dir of directions) {
      const next = {
        x: current.x + dir.x,
        y: current.y + dir.y,
      };

      if (
        next.x < 0 ||
        next.x >= GRID_W ||
        next.y < 0 ||
        next.y >= GRID_H
      ) {
        continue;
      }

      if (
        blockedCell(
          next.x,
          next.y,
          platforms,
          obstacles
        )
      ) {
        continue;
      }

      const nextKey = cellKey(
        next.x,
        next.y
      );

      const currentKey = cellKey(
        current.x,
        current.y
      );

      const tentative =
        (gScore[currentKey] ??
          Infinity) + 1;

      if (
        tentative <
        (gScore[nextKey] ??
          Infinity)
      ) {
        cameFrom[nextKey] =
          current;

        gScore[nextKey] =
          tentative;

        fScore[nextKey] =
          tentative +
          heuristic(
            next,
            goal
          );

        if (
          !open.some(
            (n) =>
              n.x === next.x &&
              n.y === next.y
          )
        ) {
          open.push(next);
        }
      }
    }
  }

  return [];
}

export function scoreTrap(
  trap,
  path,
  player,
  memory
) {
  if (!path.length) {
    return 0;
  }

  let score = 0;

  for (
    let i = 0;
    i < path.length;
    i++
  ) {
    const node = path[i];

    const wx = toWorld(node.x);
    const wy = toWorld(node.y);

    const dx = Math.abs(
      wx - trap.x
    );

    const dy = Math.abs(
      wy - trap.y
    );

    if (
      dx < 85 &&
      dy < 100
    ) {
      score += Math.max(
        1,
        32 - i * 1.4
      );
    }
  }

  // Prefer traps in front of the player.
  if (
    trap.x > player.x
  ) {
    score += 18;
  }

  // More aggressive AI gets a stronger score.
  score +=
    (memory?.aggression || 0) *
    25;

  return score;
}

export function chooseBestTrap(
  player,
  exit,
  platforms,
  obstacles,
  memory
) {
  const path =
    findPlayerPath(
      player,
      exit,
      platforms,
      obstacles
    );

  if (!path.length) {
    return null;
  }

  const candidates = [];

  for (
    let i = 2;
    i < path.length;
    i++
  ) {
    const node = path[i];

    const routeX =
      toWorld(node.x);

    // Main spike.
    candidates.push({
      x: routeX,
      y: 440,
      width: 40,
      height: 40,
      type: "spike",
      ai: true,
      activated: true,
      pulse: 1,
    });

    // Spike slightly ahead.
    candidates.push({
      x: routeX + 35,
      y: 440,
      width: 40,
      height: 40,
      type: "spike",
      ai: true,
      activated: true,
      pulse: 1,
    });

    // Spike slightly behind.
    candidates.push({
      x: routeX - 35,
      y: 440,
      width: 40,
      height: 40,
      type: "spike",
      ai: true,
      activated: true,
      pulse: 1,
    });
  }

  let best = null;
  let bestScore = -Infinity;

  for (const trap of candidates) {
    // Don't spawn directly on the player.
    if (
      Math.abs(
        trap.x - player.x
      ) < 130
    ) {
      continue;
    }

    // NEVER spawn on or near the exit / finish box.
    if (exit) {
      if (trap.x + trap.width >= exit.x - 75) {
        continue;
      }
      if (
        Math.abs(trap.x - exit.x) < 95 &&
        Math.abs(trap.y - exit.y) < 95
      ) {
        continue;
      }
    }

    // Keep safe starting zone clear.
    if (trap.x < 150) {
      continue;
    }

    // Don't stack on an existing obstacle.
    const occupied =
      obstacles.some(
        (o) =>
          Math.abs(
            o.x - trap.x
          ) < 55 &&
          Math.abs(
            o.y - trap.y
          ) < 50
      );

    if (occupied) {
      continue;
    }

    const score =
      scoreTrap(
        trap,
        path,
        player,
        memory
      );

    // Small randomness prevents
    // the AI from always choosing
    // exactly the same trap.
    const finalScore =
      score +
      Math.random() * 5;

    if (
      finalScore >
      bestScore
    ) {
      bestScore =
        finalScore;

      best = {
        ...trap,
        aiScore: finalScore,
      };
    }
  }

  return best;
}