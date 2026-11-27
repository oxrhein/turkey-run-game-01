// Gobble Dash tuning: every number that shapes the run lives here, so the world,
// the renderer and the screenshot autopilot all read the same truth.
// Canvas is a fixed 1280 x 720 logical field, scaled to the window by the renderer.
export const FIELD = { width: 1280, height: 720, groundY: 620 };

/** The fixed simulation step: the world advances in 1/60 s slices. */
export const STEP = 1 / 60;

// The turkey runs at a fixed x; the world scrolls past it. Lanes are the three
// heights the turkey can stand on (top lane is the fence rail, bottom is the dirt).
export const LANES = [312, 442, 566];
export const PLAYER = {
  x: 220,
  width: 66,
  height: 58,
  laneChangeSpeed: 900, // px per second while switching lanes
  jumpVelocity: -640, // px per second, up
  gravity: 1900, // px per second squared
  dashSpeed: 1.7, // speed multiplier while dashing
  dashTime: 0.55, // seconds a dash lasts
  dashCooldown: 2.4, // seconds before the next dash
  hideTime: 1.25, // seconds a haystack hides the turkey
};

// The run is 1500 metres to the Freedom Gate, split into three zones. Each zone
// raises the speed, tightens the spawn gap and adds hazards to the mix.
export const GOAL_METRES = 1500;
export const METRES_PER_PX = 1 / 12;
export const ZONES = [
  {
    name: 'FARMYARD',
    fromMetres: 0,
    speed: 265,
    spawnEvery: 1.05,
    hazards: ['oven', 'haybale', 'rollingpin'],
    sky: ['#ffd98a', '#f7a94b', '#e2703a'],
    ground: '#a9703a',
  },
  {
    name: 'BARNYARD',
    fromMetres: 500,
    speed: 305,
    spawnEvery: 0.88,
    hazards: ['oven', 'haybale', 'rollingpin', 'gravy', 'knife'],
    sky: ['#f7a94b', '#e2703a', '#8a4a6b'],
    ground: '#96602e',
  },
  {
    name: 'KITCHEN',
    fromMetres: 1000,
    speed: 345,
    spawnEvery: 0.72,
    hazards: ['oven', 'knife', 'rollingpin', 'gravy', 'haybale'],
    sky: ['#7a4a5e', '#5c3550', '#3c2340'],
    ground: '#6e4630',
  },
];

// Hazard shapes. w/h are in px; laneSpan says how many lanes the hazard covers
// (a knife drops from above and covers one lane; an oven is tall and covers two).
export const HAZARDS = {
  oven: { w: 84, h: 150, laneSpan: 2, label: 'OVEN' },
  haybale: { w: 78, h: 62, laneSpan: 1, label: 'HAY BALE' },
  rollingpin: { w: 92, h: 34, laneSpan: 1, label: 'ROLLING PIN', approach: 130 },
  gravy: { w: 130, h: 22, laneSpan: 1, label: 'GRAVY', slows: true },
  knife: { w: 40, h: 150, laneSpan: 1, label: 'CARVING KNIFE', drops: true },
};

export const PICKUPS = {
  corn: { w: 34, h: 44, score: 10 },
  feather: { w: 36, h: 44, label: 'GOLDEN FEATHER' },
  pie: { w: 44, h: 34, label: 'PUMPKIN PIE' },
};

export const RULES = {
  lives: 3,
  maxLives: 3,
  comboWindow: 2.5, // seconds between corn pickups to keep the combo alive
  comboMax: 5,
  farmerStartGap: 170, // px behind the turkey when the run begins
  farmerStumbleClose: 52, // px the farmer gains when the turkey is hit
  farmerCornPushback: 14, // px the farmer loses on every 5-corn streak
  farmerRecover: 7, // px per second the farmer loses while the turkey runs clean
  farmerHidePushback: 42, // px the farmer loses when the turkey hides in hay
  dashGapGain: 26, // px the farmer loses when the turkey dashes
  stumbleSlow: 0.55, // speed factor for 0.8 s after a hit
  stumbleTime: 0.8,
  bestKey: 'gobble-dash-best',
};
