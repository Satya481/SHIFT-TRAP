// game/endless.js
// Procedural stage generator for the Endless Survival Gauntlet mode.

export function generateEndlessSector(stageNumber) {
  const width = 1000;
  const height = 520;

  // Platform count scales with stage
  const platformCount = 5 + Math.min(4, Math.floor(stageNumber / 2));
  const platforms = [
    { x: 0, y: 480, width: 130, height: 40 }, // Starting floor
    { x: 880, y: 380, width: 120, height: 40 }, // Exit floor
  ];

  const obstacles = [];
  const bouncePads = [];
  const speedRails = [];
  const crushers = [];
  const gravityZones = [];
  const tripwires = [];
  const drones = [];

  // Intermediate platforms
  const stepX = (880 - 140) / (platformCount - 1);
  let currentY = 410;

  for (let i = 1; i < platformCount; i++) {
    const px = 130 + (i - 1) * stepX + (Math.random() - 0.5) * 30;
    const pWidth = 85 + Math.floor(Math.random() * 30);
    // Vary height between 290 and 420
    currentY = 300 + Math.floor(Math.random() * 120);

    const isMoving = stageNumber >= 2 && Math.random() < 0.45;
    const isFragile = stageNumber >= 3 && Math.random() < 0.3;

    platforms.push({
      x: px,
      y: currentY,
      width: pWidth,
      height: 20,
      moving: isMoving,
      minX: Math.max(100, px - 60),
      maxX: Math.min(880, px + pWidth + 60),
      speed: 2.8 + Math.random() * 1.8,
      direction: Math.random() > 0.5 ? 1 : -1,
      fragile: isFragile,
      crumbleDelay: 28,
    });

    // Floor spikes below gaps
    if (Math.random() < 0.75) {
      obstacles.push({
        x: px + 10,
        y: 440,
        width: 44,
        height: 40,
        type: "spike",
        hidden: stageNumber >= 3 && Math.random() < 0.4,
        activated: !(stageNumber >= 3 && Math.random() < 0.4),
      });
    }
  }

  // Bounce pad on starting platform or intermediate
  if (Math.random() < 0.8) {
    bouncePads.push({
      x: 60,
      y: 472,
      width: 32,
      height: 8,
      force: -13.8,
    });
  }

  if (stageNumber >= 2) {
    speedRails.push({ x: 250, y: 390, width: 105, height: 10, speed: 7.5, direction: stageNumber % 2 ? 1 : -1 });
  }
  if (stageNumber >= 3) {
    crushers.push({ id: `c-${stageNumber}`, x: 600, y: 120, width: 48, height: 300, floorY: 440, cycle: 150, phase: 20 });
  }
  if (stageNumber >= 4) {
    gravityZones.push({ id: `g-${stageNumber}`, x: 420, y: 220, width: 150, height: 190 });
    tripwires.push({ id: `t-${stageNumber}`, x: 760, y: 430, width: 3, height: 50, spikeX: 750 });
  }
  if (stageNumber >= 5) {
    drones.push({ id: `d-${stageNumber}`, x: 450, y: 190, width: 28, height: 18, minX: 300, maxX: 820, speed: 2.1 });
  }

  const mechanics = {
    endless: true,
    stage: stageNumber,
    inversion: stageNumber >= 4 && Math.random() < 0.4,
    inversionEvery: 280,
    inversionDuration: 75,
    prediction: stageNumber >= 3,
    hunt: stageNumber >= 5,
    aiDelay: Math.max(18, 48 - stageNumber * 4),
    maxAI: Math.min(18, 6 + stageNumber * 2),
  };

  return {
    id: 100 + stageNumber,
    name: `GAUNTLET // ${String(stageNumber).padStart(2, "0")}`,
    difficulty: Math.min(10, 3 + stageNumber),
    player: { x: 45, y: 420, width: 28, height: 28 },
    exit: { x: 940, y: 320, width: 35, height: 60 },
    platforms,
    obstacles,
    bouncePads,
    speedRails,
    crushers,
    gravityZones,
    tripwires,
    drones,
    mechanics,
  };
}
