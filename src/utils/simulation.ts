import type { CarSetup, Track, SimulationResult } from '../types';
import {
  totalLiftCoefficient, totalDragCoefficient,
  downforce, dragForce, tirePressureGrip,
  maxCornerSpeed, theoreticalTopSpeed,
  fuelEffect, msToKph, kphToMs, round,
} from './physics';

const CAR_MASS = 798; // kg (F1 minimum weight)
const ENGINE_POWER = 750000; // 750kW (~1000hp hybrid)
const BASE_MU = 1.8; // F1 tire grip coefficient (much higher than road tires!)

function cornerRadius(sectorType: string): number {
  switch (sectorType) {
    case 'slow-corner': return 30;
    case 'medium-corner': return 80;
    case 'fast-corner': return 200;
    default: return 1000;
  }
}

export function simulateLap(setup: CarSetup, track: Track): SimulationResult {
  const cl = totalLiftCoefficient(setup.frontWingAngle, setup.rearWingAngle);
  const cd = totalDragCoefficient(setup.frontWingAngle, setup.rearWingAngle);

  const totalMass = CAR_MASS + setup.fuelLoad;
  const avgTireGrip = (tirePressureGrip(setup.tirePressureFront) + tirePressureGrip(setup.tirePressureRear)) / 2;
  const mu = BASE_MU * avgTireGrip;

  // Suspension affects mechanical grip (0.95-1.05 range)
  const suspFactor = 1.0 - Math.abs(setup.suspensionStiffness - 50) * 0.001;

  // Brake balance affects corner entry (optimal ~57% front)
  const brakeOptimal = 57;
  const brakePenalty = Math.abs(setup.brakeBalance - brakeOptimal) * 0.003;

  // ERS gives extra power on straights
  const ersBoost = setup.ersDeployMode * 24000; // 0-120kW extra
  const effectivePower = ENGINE_POWER + ersBoost;

  const topSpeedMs = theoreticalTopSpeed(effectivePower, cd);
  const feedback: string[] = [];
  const sectorTimes: number[] = [];
  let maxSpeed = 0;
  let totalCornerSpeed = 0;
  let cornerCount = 0;

  for (const sector of track.sectors) {
    let sectorTime: number;

    if (sector.type === 'straight') {
      // Straight: time ≈ distance / average speed
      // Average speed is roughly 85% of top speed (acceleration limited)
      const avgSpeed = topSpeedMs * 0.85;
      sectorTime = sector.lengthM / avgSpeed;
      maxSpeed = Math.max(maxSpeed, topSpeedMs);
    } else {
      // Corner: limited by grip
      const radius = cornerRadius(sector.type);
      const cornerSpeed = kphToMs(200); // approximate speed for downforce calc
      const df = downforce(cornerSpeed, cl);
      const vMax = maxCornerSpeed(mu * suspFactor, radius, df, totalMass);
      const avgCornerSpeed = vMax * 0.9; // braking and acceleration zones
      sectorTime = sector.lengthM / avgCornerSpeed;
      sectorTime *= (1 + brakePenalty); // brake balance penalty
      totalCornerSpeed += msToKph(vMax);
      cornerCount++;
    }

    // Fuel weight penalty
    sectorTime += fuelEffect(setup.fuelLoad) * (sectorTime / track.referenceTime);

    // Small random variation for realism (+/- 0.5%)
    sectorTime *= 0.995 + Math.random() * 0.01;

    sectorTimes.push(round(sectorTime, 3));
  }

  const totalTime = round(sectorTimes.reduce((a, b) => a + b, 0), 3);
  const df = downforce(kphToMs(250), cl);
  const dr = dragForce(kphToMs(250), cd);

  // Generate feedback
  if (cl > 1.5) feedback.push('High downforce setup - great for tight circuits');
  if (cl < 0.8) feedback.push('Low downforce - you\'ll be fast on straights but struggle in corners');
  if (cd > 0.8) feedback.push('Warning: Very high drag is costing you top speed');
  if (avgTireGrip < 0.9) feedback.push('Tire pressure is outside optimal window - losing grip!');
  if (Math.abs(setup.brakeBalance - 57) > 8) feedback.push('Brake balance is far from optimal - car will be unstable under braking');
  if (setup.fuelLoad > 80) feedback.push('Heavy fuel load is slowing you down significantly');
  if (setup.ersDeployMode >= 4) feedback.push('High ERS deploy - great straight speed but watch energy management');
  if (suspFactor < 0.97) feedback.push('Suspension is too stiff or too soft - find the middle ground');

  // Timing gap feedback is handled by the Setup Coach section instead

  return {
    totalTime,
    sectorTimes,
    topSpeed: round(msToKph(maxSpeed), 1),
    avgCornerSpeed: cornerCount > 0 ? round(totalCornerSpeed / cornerCount, 1) : 0,
    downforce: round(df, 0),
    drag: round(dr, 0),
    feedback,
  };
}

/** Find the optimal setup for a track using grid search over key parameters */
export function findOptimalSetup(track: Track): { setup: CarSetup; lapTime: number; sectorTimes: number[] } {
  let bestTime = Infinity;
  let bestSetup: CarSetup = defaultSetup(track.id);
  let bestSectors: number[] = [];

  // Grid search over wing angles (main trade-off), other params at known optima
  // Fixed optima: tire pressure 23, suspension 50, brake 57, fuel 5 (minimum), ERS 5 (max)
  for (let front = 2; front <= 15; front += 1) {
    for (let rear = 3; rear <= 25; rear += 1) {
      const testSetup: CarSetup = {
        id: 'optimal',
        name: 'Optimal',
        trackId: track.id,
        date: '',
        frontWingAngle: front,
        rearWingAngle: rear,
        tirePressureFront: 23,
        tirePressureRear: 23,
        suspensionStiffness: 50,
        brakeBalance: 57,
        fuelLoad: 5,
        ersDeployMode: 5,
      };

      // Run simulation WITHOUT random variation
      const result = simulateLapDeterministic(testSetup, track);
      if (result.totalTime < bestTime) {
        bestTime = result.totalTime;
        bestSetup = { ...testSetup };
        bestSectors = result.sectorTimes;
      }
    }
  }

  return { setup: bestSetup, lapTime: round(bestTime, 3), sectorTimes: bestSectors };
}

/** Deterministic version of simulateLap (no random variation) for optimization */
function simulateLapDeterministic(setup: CarSetup, track: Track): { totalTime: number; sectorTimes: number[] } {
  const cl = totalLiftCoefficient(setup.frontWingAngle, setup.rearWingAngle);
  const cd = totalDragCoefficient(setup.frontWingAngle, setup.rearWingAngle);
  const totalMass = 798 + setup.fuelLoad;
  const avgTireGrip = (tirePressureGrip(setup.tirePressureFront) + tirePressureGrip(setup.tirePressureRear)) / 2;
  const mu = 1.8 * avgTireGrip;
  const suspFactor = 1.0 - Math.abs(setup.suspensionStiffness - 50) * 0.001;
  const brakePenalty = Math.abs(setup.brakeBalance - 57) * 0.003;
  const ersBoost = setup.ersDeployMode * 24000;
  const effectivePower = 750000 + ersBoost;
  const topSpeedMs = theoreticalTopSpeed(effectivePower, cd);

  const sectorTimes: number[] = [];
  for (const sector of track.sectors) {
    let sectorTime: number;
    if (sector.type === 'straight') {
      const avgSpeed = topSpeedMs * 0.85;
      sectorTime = sector.lengthM / avgSpeed;
    } else {
      const radius = cornerRadius(sector.type);
      const cornerSpeed = kphToMs(200);
      const df = downforce(cornerSpeed, cl);
      const vMax = maxCornerSpeed(mu * suspFactor, radius, df, totalMass);
      const avgCornerSpeed = vMax * 0.9;
      sectorTime = sector.lengthM / avgCornerSpeed;
      sectorTime *= (1 + brakePenalty);
    }
    sectorTime += fuelEffect(setup.fuelLoad) * (sectorTime / track.referenceTime);
    sectorTimes.push(round(sectorTime, 3));
  }

  const totalTime = sectorTimes.reduce((a, b) => a + b, 0);
  return { totalTime, sectorTimes };
}

/** Direction hint for a parameter: how far off and which way */
export type HintDirection = 'up-big' | 'up-small' | 'good' | 'down-small' | 'down-big';

export interface ParamHint {
  param: string;
  direction: HintDirection;
  reason: string;
  teachingTip: string;
}

/** Generate directional coaching hints — no exact values revealed */
export function getSetupRecommendations(
  current: CarSetup,
  optimal: CarSetup,
  currentTime: number,
  optimalTime: number,
  track: Track
): { recommendations: string[]; paramHints: ParamHint[] } {
  const recommendations: string[] = [];
  const paramHints: ParamHint[] = [];
  const gap = round(currentTime - optimalTime, 3);

  const hint = (diff: number, threshold: number): HintDirection => {
    if (Math.abs(diff) <= threshold) return 'good';
    if (diff > threshold * 3) return 'down-big';
    if (diff > threshold) return 'down-small';
    if (diff < -threshold * 3) return 'up-big';
    return 'up-small';
  };

  // Count track character
  const straights = track.sectors.filter(s => s.type === 'straight').length;
  const slowCorners = track.sectors.filter(s => s.type === 'slow-corner').length;
  const fastCorners = track.sectors.filter(s => s.type === 'fast-corner').length;
  const isHighDF = (slowCorners + fastCorners) > straights;

  // Front wing
  const frontDiff = current.frontWingAngle - optimal.frontWingAngle;
  const frontDir = hint(frontDiff, 1);
  if (frontDir !== 'good') {
    const reason = frontDiff > 0
      ? 'Extra front wing adds drag — you\'re losing time on the straights'
      : 'Not enough front wing — the car will understeer into corners';
    paramHints.push({ param: 'Front Wing', direction: frontDir, reason, teachingTip: 'Front wing mainly affects turn-in grip and front-end drag. More angle = more grip but more drag.' });
  } else {
    paramHints.push({ param: 'Front Wing', direction: 'good', reason: 'Good front-end balance', teachingTip: 'Front wing mainly affects turn-in grip and front-end drag.' });
  }

  // Rear wing
  const rearDiff = current.rearWingAngle - optimal.rearWingAngle;
  const rearDir = hint(rearDiff, 1);
  if (rearDir !== 'good') {
    const reason = rearDiff > 0
      ? 'Too much rear wing — massive drag penalty on the straights'
      : isHighDF
        ? 'This twisty track needs more rear grip for traction out of slow corners'
        : 'A bit more rear wing would help stability through the fast sweepers';
    paramHints.push({ param: 'Rear Wing', direction: rearDir, reason, teachingTip: 'Rear wing is the BIGGEST aero trade-off. It controls rear grip vs straight-line speed. The ideal angle depends on how many corners vs straights the track has.' });
  } else {
    paramHints.push({ param: 'Rear Wing', direction: 'good', reason: 'Rear aero well balanced for this track', teachingTip: 'Rear wing is the biggest aero trade-off — corner grip vs straight speed.' });
  }

  // Tire pressures
  const frontPSIDiff = current.tirePressureFront - 23;
  const frontPSIDir = hint(frontPSIDiff, 1);
  paramHints.push({
    param: 'Front Tire PSI',
    direction: frontPSIDir,
    reason: frontPSIDir === 'good' ? 'In the grip sweet spot' : frontPSIDiff > 0 ? 'Pressure too high — contact patch is shrinking, losing grip' : 'Pressure too low — tire is deforming too much, losing response',
    teachingTip: 'Tire grip follows a curve — there\'s a sweet spot where the rubber contact patch is maximised. Too high or too low and grip drops off sharply.',
  });
  const rearPSIDiff = current.tirePressureRear - 23;
  const rearPSIDir = hint(rearPSIDiff, 1);
  paramHints.push({
    param: 'Rear Tire PSI',
    direction: rearPSIDir,
    reason: rearPSIDir === 'good' ? 'In the grip sweet spot' : rearPSIDiff > 0 ? 'Pressure too high — rear end is sliding on corner exit' : 'Pressure too low — rear tire overheating from excess deformation',
    teachingTip: 'Same sweet-spot principle as the fronts. Think about it: the rubber needs to be in full contact with the road surface.',
  });

  // Suspension
  const suspDiff = current.suspensionStiffness - 50;
  const suspDir = hint(suspDiff, 8);
  paramHints.push({
    param: 'Suspension',
    direction: suspDir,
    reason: suspDir === 'good' ? 'Good mechanical platform' : suspDiff > 0 ? 'Too stiff — car is bouncing over kerbs and bumps, losing contact with the track' : 'Too soft — car is wallowing through direction changes, slow to respond',
    teachingTip: 'Suspension controls how the car\'s weight transfers. Too stiff = the car skips. Too soft = the car rolls excessively. You want a balance that keeps the tires loaded evenly.',
  });

  // Brake balance
  const brakeDiff = current.brakeBalance - 57;
  const brakeDir = hint(brakeDiff, 2);
  paramHints.push({
    param: 'Brake Balance',
    direction: brakeDir,
    reason: brakeDir === 'good' ? 'Stable braking zone' : brakeDiff > 0 ? 'Too much front bias — front tires lock first, car understeers into corners' : 'Too much rear bias — rear locks up, car snaps around under braking',
    teachingTip: 'Under braking, weight shifts forward. The ideal brake balance matches the car\'s weight distribution so both axles reach their grip limit together. Think F=ma and where the mass is!',
  });

  // Fuel
  const fuelDir: HintDirection = current.fuelLoad <= 15 ? 'good' : current.fuelLoad <= 40 ? 'down-small' : 'down-big';
  paramHints.push({
    param: 'Fuel Load',
    direction: fuelDir,
    reason: fuelDir === 'good' ? 'Light and fast' : `Carrying ${current.fuelLoad}kg — every extra kg costs ~0.03s per lap from F=ma`,
    teachingTip: 'More mass means more inertia (F=ma). A heavier car accelerates slower, brakes longer, and has less grip in corners. For a qualifying lap, go as light as possible!',
  });

  // ERS
  const ersDir: HintDirection = current.ersDeployMode >= 4 ? 'good' : current.ersDeployMode >= 2 ? 'up-small' : 'up-big';
  paramHints.push({
    param: 'ERS Deploy',
    direction: ersDir,
    reason: ersDir === 'good' ? 'Maximum electrical boost' : 'You\'re leaving free power on the table — ERS adds up to 120kW on straights',
    teachingTip: 'The MGU-K recovers braking energy and redeploys it as extra power. Higher deploy = more straight-line speed. It\'s essentially free energy from the kinetic energy you\'d otherwise waste as heat in the brakes.',
  });

  // Overall assessment — no exact numbers, just qualitative guidance
  if (gap <= 0.3) {
    recommendations.push('Incredible setup! You\'re right on the limit — that\'s race-winning pace. A real engineer would be proud of this.');
  } else if (gap <= 1.0) {
    recommendations.push('Solid work! You\'re close to the optimum. Small refinements will close the gap — check the amber indicators below.');
  } else if (gap <= 3.0) {
    recommendations.push(`There\'s time to find. Focus on the red indicators first — those are costing you the most. Think about what this track demands: ${isHighDF ? 'lots of corners need grip' : 'long straights need low drag'}.`);
  } else {
    recommendations.push('Big gap to the optimum — start with the parameters showing red arrows. Ask yourself: does this track need downforce or top speed?');
  }

  // Track-specific educational tip
  if (isHighDF) {
    recommendations.push(`${track.name} has ${slowCorners + fastCorners} corners and ${straights} straights — think about which matters more for total lap time.`);
  } else {
    recommendations.push(`${track.name} has ${straights} straights and ${slowCorners + fastCorners} corners — where do you spend the most time?`);
  }

  return { recommendations, paramHints };
}

export function defaultSetup(trackId: string): CarSetup {
  return {
    id: crypto.randomUUID(),
    name: 'New Setup',
    trackId,
    date: new Date().toISOString().slice(0, 10),
    frontWingAngle: 8,
    rearWingAngle: 12,
    tirePressureFront: 23,
    tirePressureRear: 23,
    suspensionStiffness: 50,
    brakeBalance: 57,
    fuelLoad: 50,
    ersDeployMode: 3,
  };
}
