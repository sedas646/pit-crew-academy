import type { TelemetryPoint, Track } from '../types';

/**
 * Generates realistic telemetry data for a lap.
 * The "skill level" parameter controls how clean the driving is.
 */
export function generateTelemetry(
  track: Track,
  skill: 'good' | 'average' | 'poor' = 'good',
  seed: number = 0
): TelemetryPoint[] {
  const points: TelemetryPoint[] = [];
  let distance = 0;
  let speed = 80; // starting speed in kph
  const noise = skill === 'good' ? 0.02 : skill === 'average' ? 0.06 : 0.12;
  const rng = seededRandom(seed);

  for (const sector of track.sectors) {
    const sectorPoints = 20;
    const stepSize = sector.lengthM / sectorPoints;

    for (let i = 0; i < sectorPoints; i++) {
      distance += stepSize;

      if (sector.type === 'straight') {
        // Accelerate on straights
        const targetSpeed = 310 + rng() * 20;
        speed = speed + (targetSpeed - speed) * 0.15;
        const throttle = Math.min(100, 80 + (1 - speed / targetSpeed) * 100);
        points.push({
          distance: Math.round(distance),
          speed: Math.round(speed + rng() * noise * speed),
          throttle: Math.round(Math.max(0, Math.min(100, throttle + rng() * 5))),
          brake: 0,
          gear: speed > 280 ? 8 : speed > 240 ? 7 : speed > 200 ? 6 : 5,
          lateralG: round2(rng() * 0.3),
          drs: speed > 280 && i > 5,
        });
      } else {
        // Corners: brake then accelerate
        const targetSpeed = sector.type === 'slow-corner' ? 90 : sector.type === 'medium-corner' ? 160 : 230;
        const phase = i / sectorPoints;

        if (phase < 0.25) {
          // Braking zone
          const brakeForce = skill === 'poor' ? 70 : skill === 'average' ? 85 : 95;
          speed = speed - (speed - targetSpeed) * 0.3;
          const brakePressure = Math.max(0, (speed - targetSpeed) / speed * brakeForce);
          points.push({
            distance: Math.round(distance),
            speed: Math.round(speed + rng() * noise * speed),
            throttle: 0,
            brake: Math.round(Math.min(100, brakePressure + rng() * 10)),
            gear: speed > 200 ? 5 : speed > 150 ? 4 : speed > 100 ? 3 : 2,
            lateralG: round2(0.5 + rng() * 1),
            drs: false,
          });
        } else if (phase < 0.6) {
          // Apex - minimum speed
          speed = targetSpeed + rng() * noise * targetSpeed;
          const lateralG = sector.type === 'slow-corner' ? 3.5 : sector.type === 'medium-corner' ? 3.0 : 2.5;
          points.push({
            distance: Math.round(distance),
            speed: Math.round(speed),
            throttle: Math.round(15 + rng() * 20),
            brake: 0,
            gear: speed > 200 ? 5 : speed > 150 ? 4 : speed > 100 ? 3 : 2,
            lateralG: round2(lateralG + rng() * 0.5),
            drs: false,
          });
        } else {
          // Exit - accelerating
          speed = speed + (280 - speed) * 0.12;
          const throttleApplication = skill === 'poor' ? 60 : skill === 'average' ? 80 : 95;
          points.push({
            distance: Math.round(distance),
            speed: Math.round(speed + rng() * noise * speed),
            throttle: Math.round(Math.min(100, throttleApplication + rng() * 10)),
            brake: 0,
            gear: speed > 200 ? 5 : speed > 150 ? 4 : speed > 100 ? 3 : 2,
            lateralG: round2(1.5 + rng() * 1),
            drs: false,
          });
        }
      }
    }
  }

  return points;
}

/**
 * Identifies differences between two telemetry datasets.
 * Returns indices where driver B is slower.
 */
export function findTimeLoss(
  driverA: TelemetryPoint[],
  driverB: TelemetryPoint[]
): { index: number; speedDiff: number; reason: string }[] {
  const losses: { index: number; speedDiff: number; reason: string }[] = [];
  const len = Math.min(driverA.length, driverB.length);

  for (let i = 1; i < len - 1; i++) {
    const diff = driverA[i].speed - driverB[i].speed;
    if (diff > 15) {
      let reason = 'slower';
      if (driverB[i].brake > 50 && driverA[i].brake < 20) reason = 'braking too early';
      else if (driverB[i].throttle < driverA[i].throttle - 30) reason = 'late on throttle';
      else if (driverB[i].lateralG < driverA[i].lateralG - 0.8) reason = 'not using full grip';
      losses.push({ index: i, speedDiff: Math.round(diff), reason });
    }
  }

  return losses;
}

function seededRandom(seed: number) {
  let s = seed || 42;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s / 0x7fffffff);
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
