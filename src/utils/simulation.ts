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
