// ============================================
// ENDLESS MODE — HELL: Forever Atoning
// ============================================

import { getRandomMap } from "../levels/story-map-pool.js";

const ENDLESS_MUTATIONS = [
  "canSense",
  "canManifest",
  "canTrace",
  "canPhase",
  "canSplit",
];

export const HELL_PHASES = [
  {
    from: 1,
    to: 3,
    name: "THE FIRST CIRCLE",
    subtitle: "Where the newly damned wander.",
  },
  {
    from: 4,
    to: 7,
    name: "THE SCREAMING HALLS",
    subtitle: "Every soul you took has a voice here.",
  },
  {
    from: 8,
    to: 12,
    name: "THE WEEPING DARK",
    subtitle: "The children you left behind are hungry.",
  },
  {
    from: 13,
    to: 18,
    name: "THE BLOOD REGISTRY",
    subtitle: "Your victims remember every wound.",
  },
  {
    from: 19,
    to: 25,
    name: "THE UNMAKING",
    subtitle: "You forget your own name here.",
  },
  {
    from: 26,
    to: 999,
    name: "THE PIT",
    subtitle: "There is no bottom. Only lower.",
  },
];

export function getHellPhase(floor) {
  for (const phase of HELL_PHASES) {
    if (floor >= phase.from && floor <= phase.to) {
      return phase;
    }
  }
  return HELL_PHASES[HELL_PHASES.length - 1];
}

export function getHellDescription(floor) {
  const phase = getHellPhase(floor);
  const messages = [
    `"${phase.subtitle}"`,
    `"The rift is a lie. You will not escape."`,
    `"They are waiting. All of them."`,
    `"You cannot repent. Only endure."`,
    `"The Silver Shadow rusts here."`,
    `"Every step is a mile toward nothing."`,
    `"You dug this pit yourself."`,
    `"The dead are patient."`,
    `"Floor ${floor}. It grows stronger. So does your guilt."`,
    `"Something older watches from below."`,
    `"You cannot die. That would be mercy."`,
  ];
  return messages[floor % messages.length];
}

export function generateEndlessMap(floor) {
  // Rotate through story maps but choose harder ones as floor increases
  let poolIdx;
  if (floor <= 3)
    poolIdx = Math.floor(Math.random() * 3); // 0-2
  else if (floor <= 7)
    poolIdx = 2 + Math.floor(Math.random() * 3); // 2-4
  else poolIdx = 3 + Math.floor(Math.random() * 3); // 3-5

  poolIdx = Math.min(5, poolIdx);
  return getRandomMap(poolIdx);
}

export function createEndlessLevel(floor) {
  const mutationsForFloor = {};

  // Faster ability unlocks in hell
  ENDLESS_MUTATIONS.forEach((mutation, i) => {
    if (floor >= (i + 1) * 3) {
      mutationsForFloor[mutation] = true;
    }
  });

  const phase = getHellPhase(floor);

  // Souls scale with floor
  const soulsNeeded = Math.min(15, 4 + Math.floor(floor / 2));

  // Speed scales
  const phantomSpeed = 55 + Math.floor(floor * 2.5);

  return {
    name: phase.name,
    ability: `FLOOR ${floor}`,
    description: getHellDescription(floor),
    mutations: mutationsForFloor,
    soulsNeeded: soulsNeeded,
    phantomSpeed: Math.min(140, phantomSpeed),
    map: generateEndlessMap(floor),
  };
}
