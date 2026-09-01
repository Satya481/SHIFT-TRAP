export const LEVELS = [
  {
    id: 1,
    name: "LEARN",
    difficulty: 1,

    player: {
      x: 60,
      y: 420,
      width: 28,
      height: 28,
    },

    exit: {
      x: 900,
      y: 420,
      width: 35,
      height: 60,
    },

    platforms: [
      { x: 0, y: 480, width: 1000, height: 40 },
      { x: 170, y: 400, width: 130, height: 20 },
      { x: 370, y: 350, width: 130, height: 20 },
      { x: 570, y: 400, width: 130, height: 20 },
      { x: 760, y: 350, width: 130, height: 20 },
    ],

    obstacles: [
      {
        x: 320,
        y: 440,
        width: 40,
        height: 40,
        type: "spike",
      },
      {
        x: 710,
        y: 440,
        width: 40,
        height: 40,
        type: "spike",
      },
    ],
  },

  {
    id: 2,
    name: "SHIFT",
    difficulty: 2,

    player: {
      x: 60,
      y: 420,
      width: 28,
      height: 28,
    },

    exit: {
      x: 900,
      y: 420,
      width: 35,
      height: 60,
    },

    platforms: [
      { x: 0, y: 480, width: 1000, height: 40 },

      {
        x: 150,
        y: 400,
        width: 120,
        height: 20,
        moving: true,
        minX: 120,
        maxX: 330,
        speed: 2,
      },

      {
        x: 400,
        y: 340,
        width: 120,
        height: 20,
        moving: true,
        minX: 350,
        maxX: 620,
        speed: 2.5,
      },

      {
        x: 700,
        y: 390,
        width: 140,
        height: 20,
      },
    ],

    obstacles: [
      {
        x: 330,
        y: 440,
        width: 40,
        height: 40,
        type: "spike",
      },

      {
        x: 620,
        y: 440,
        width: 40,
        height: 40,
        type: "spike",
      },
    ],
  },

  {
    id: 3,
    name: "BAIT",
    difficulty: 3,

    player: {
      x: 60,
      y: 420,
      width: 28,
      height: 28,
    },

    exit: {
      x: 900,
      y: 420,
      width: 35,
      height: 60,
    },

    platforms: [
      { x: 0, y: 480, width: 1000, height: 40 },

      { x: 140, y: 400, width: 130, height: 20 },
      { x: 330, y: 350, width: 130, height: 20 },
      { x: 520, y: 400, width: 130, height: 20 },
      { x: 710, y: 350, width: 130, height: 20 },
    ],

    obstacles: [
      {
        x: 270,
        y: 440,
        width: 45,
        height: 40,
        type: "spike",
        hidden: true,
      },

      {
        x: 465,
        y: 440,
        width: 45,
        height: 40,
        type: "spike",
        hidden: true,
      },

      {
        x: 655,
        y: 440,
        width: 45,
        height: 40,
        type: "spike",
        hidden: true,
      },
    ],
  },

  {
    id: 4,
    name: "REVERSE",
    difficulty: 4,

    player: {
      x: 60,
      y: 420,
      width: 28,
      height: 28,
    },

    exit: {
      x: 900,
      y: 420,
      width: 35,
      height: 60,
    },

    platforms: [
      { x: 0, y: 480, width: 1000, height: 40 },

      { x: 120, y: 410, width: 100, height: 20 },
      { x: 280, y: 350, width: 100, height: 20 },
      { x: 440, y: 410, width: 100, height: 20 },
      { x: 600, y: 340, width: 100, height: 20 },
      { x: 760, y: 400, width: 110, height: 20 },
    ],

    obstacles: [
      {
        x: 225,
        y: 440,
        width: 40,
        height: 40,
        type: "spike",
      },

      {
        x: 390,
        y: 440,
        width: 40,
        height: 40,
        type: "spike",
      },

      {
        x: 550,
        y: 440,
        width: 40,
        height: 40,
        type: "spike",
      },

      {
        x: 710,
        y: 440,
        width: 40,
        height: 40,
        type: "spike",
      },
    ],
  },

  {
    id: 5,
    name: "PREDICT",
    difficulty: 5,

    player: {
      x: 60,
      y: 420,
      width: 28,
      height: 28,
    },

    exit: {
      x: 900,
      y: 420,
      width: 35,
      height: 60,
    },

    platforms: [
      { x: 0, y: 480, width: 1000, height: 40 },

      { x: 120, y: 410, width: 110, height: 20 },
      { x: 290, y: 350, width: 110, height: 20 },
      { x: 460, y: 400, width: 110, height: 20 },
      { x: 630, y: 330, width: 110, height: 20 },
      { x: 790, y: 400, width: 110, height: 20 },
    ],

    obstacles: [],
  },

  {
    id: 6,
    name: "ESCAPE",
    difficulty: 6,

    player: {
      x: 60,
      y: 420,
      width: 28,
      height: 28,
    },

    exit: {
      x: 900,
      y: 420,
      width: 35,
      height: 60,
    },

    platforms: [
      { x: 0, y: 480, width: 1000, height: 40 },

      { x: 110, y: 410, width: 100, height: 20 },
      { x: 260, y: 350, width: 100, height: 20 },
      { x: 410, y: 400, width: 100, height: 20 },
      { x: 560, y: 330, width: 100, height: 20 },
      { x: 710, y: 400, width: 100, height: 20 },
      { x: 850, y: 350, width: 100, height: 20 },
    ],

    obstacles: [],
  },
];