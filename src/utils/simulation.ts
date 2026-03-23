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

  const timeDiff = totalTime - track.referenceTime;
  if (timeDiff < 0) feedback.push(`Incredible! ${round(Math.abs(timeDiff), 3)}s faster than reference!`);
  else if (timeDiff < 1) feedback.push(`Close to reference time - just ${round(timeDiff, 3)}s off!`);
  else if (timeDiff < 3) feedback.push(`${round(timeDiff, 3)}s off the pace - keep tuning!`);
  else feedback.push(`${round(timeDiff, 3)}s off the pace - try adjusting your aero and tire setup`);

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

/** Generate specific recommendations comparing current setup to optimal */
export function getSetupRecommendations(
  current: CarSetup,
  optimal: CarSetup,
  currentTime: number,
  optimalTime: number,
  track: Track
): { recommendations: string[]; paramHints: { param: string; current: number; optimal: number; unit: string; impact: string }[] } {
  const recommendations: string[] = [];
  const paramHints: { param: string; current: number; optimal: number; unit: string; impact: string }[] = [];
  const gap = round(currentTime - optimalTime, 3);

  // Aero analysis
  const frontDiff = current.frontWingAngle - optimal.frontWingAngle;
  const rearDiff = current.rearWingAngle - optimal.rearWingAngle;

  // Count track character
  const straights = track.sectors.filter(s => s.type === 'straight').length;
  const slowCorners = track.sectors.filter(s => s.type === 'slow-corner').length;
  const fastCorners = track.sectors.filter(s => s.type === 'fast-corner').length;
  const isHighDF = (slowCorners + fastCorners) > straights;

  if (Math.abs(frontDiff) >= 2) {
    const dir = frontDiff > 0 ? 'Reduce' : 'Increase';
    const reason = frontDiff > 0
      ? 'You have too much front wing — extra drag is costing you on the straights'
      : 'More front wing will improve turn-in grip and front-end balance';
    recommendations.push(`${dir} front wing angle by ${Math.abs(frontDiff)}°. ${reason}.`);
    paramHints.push({ param: 'Front Wing', current: current.frontWingAngle, optimal: optimal.frontWingAngle, unit: '°', impact: 'Downforce vs drag balance' });
  }

  if (Math.abs(rearDiff) >= 2) {
    const dir = rearDiff > 0 ? 'Reduce' : 'Increase';
    const reason = rearDiff > 0
      ? 'Too much rear wing creates excessive drag — trim it for better straight speed'
      : isHighDF
        ? 'This track needs more rear downforce for traction out of slow corners'
        : 'A bit more rear wing will help stability in the fast sections';
    recommendations.push(`${dir} rear wing angle by ${Math.abs(rearDiff)}°. ${reason}.`);
    paramHints.push({ param: 'Rear Wing', current: current.rearWingAngle, optimal: optimal.rearWingAngle, unit: '°', impact: 'Biggest single factor for lap time' });
  }

  // Tire pressure
  if (Math.abs(current.tirePressureFront - 23) > 1) {
    recommendations.push(`Front tire pressure is ${current.tirePressureFront > 23 ? 'too high' : 'too low'}. Move toward 23 PSI for peak mechanical grip.`);
    paramHints.push({ param: 'Front Tire PSI', current: current.tirePressureFront, optimal: 23, unit: ' PSI', impact: 'Grip drops off sharply away from 23 PSI' });
  }
  if (Math.abs(current.tirePressureRear - 23) > 1) {
    recommendations.push(`Rear tire pressure is ${current.tirePressureRear > 23 ? 'too high' : 'too low'}. 23 PSI is the sweet spot for rear grip.`);
    paramHints.push({ param: 'Rear Tire PSI', current: current.tirePressureRear, optimal: 23, unit: ' PSI', impact: 'Grip drops off sharply away from 23 PSI' });
  }

  // Suspension
  if (Math.abs(current.suspensionStiffness - 50) > 10) {
    recommendations.push(`Suspension at ${current.suspensionStiffness}% is ${current.suspensionStiffness > 50 ? 'too stiff — the car is skipping over bumps' : 'too soft — the car is wallowing'}. 50% gives the best mechanical platform.`);
    paramHints.push({ param: 'Suspension', current: current.suspensionStiffness, optimal: 50, unit: '%', impact: 'Affects mechanical grip in all corners' });
  }

  // Brake balance
  if (Math.abs(current.brakeBalance - 57) > 3) {
    const issue = current.brakeBalance > 57
      ? 'Too much front bias — you\'ll lock the fronts and understeer into corners'
      : 'Too much rear bias — the rear will lock up and snap around on you';
    recommendations.push(`Brake balance at ${current.brakeBalance}% is off. ${issue}. Target 57%.`);
    paramHints.push({ param: 'Brake Balance', current: current.brakeBalance, optimal: 57, unit: '% front', impact: 'Affects braking stability and corner entry' });
  }

  // Fuel
  if (current.fuelLoad > 20) {
    recommendations.push(`Running ${current.fuelLoad}kg fuel. Every extra kg costs ~0.03s per lap. For a qualifying-style lap, go as light as possible.`);
    paramHints.push({ param: 'Fuel Load', current: current.fuelLoad, optimal: 5, unit: ' kg', impact: `${round((current.fuelLoad - 5) * 0.03, 2)}s lost per lap from extra weight` });
  }

  // ERS
  if (current.ersDeployMode < 4) {
    recommendations.push(`ERS deploy at ${current.ersDeployMode}/5. Crank it up! More ERS means up to 120kW extra power on straights.`);
    paramHints.push({ param: 'ERS Deploy', current: current.ersDeployMode, optimal: 5, unit: '/5', impact: 'Free speed on straights' });
  }

  // Overall assessment
  if (gap <= 0.3) {
    recommendations.unshift('🟢 Excellent! You\'re within 0.3s of the theoretical optimum — that\'s a world-class setup!');
  } else if (gap <= 1.0) {
    recommendations.unshift(`🟡 Good work! ${gap}s off optimal. A few tweaks and you'll be right on the pace.`);
  } else if (gap <= 3.0) {
    recommendations.unshift(`🟠 ${gap}s off optimal pace. Focus on the biggest gains first — wing angles and tire pressures.`);
  } else {
    recommendations.unshift(`🔴 ${gap}s off optimal. Your setup needs significant changes — start with the highlighted parameters below.`);
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
