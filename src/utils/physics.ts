// Real motorsport engineering formulas
// All units are SI unless noted

const AIR_DENSITY = 1.225; // kg/m³ at sea level
const GRAVITY = 9.81; // m/s²
const REFERENCE_AREA = 1.5; // m² (typical F1 car frontal area)

// === AERODYNAMICS ===

/** Lift coefficient from wing angle (simplified linear model up to stall) */
export function liftCoefficient(wingAngleDeg: number): number {
  // Cl increases roughly linearly with angle, stalls around 18°
  if (wingAngleDeg > 18) return 0.1 * 18 - 0.05 * (wingAngleDeg - 18);
  return 0.1 * wingAngleDeg;
}

/** Drag coefficient from wing angle (increases quadratically) */
export function dragCoefficient(wingAngleDeg: number): number {
  return 0.3 + 0.004 * wingAngleDeg * wingAngleDeg;
}

/** Combined lift coefficient from front + rear wing */
export function totalLiftCoefficient(frontAngle: number, rearAngle: number): number {
  return liftCoefficient(frontAngle) * 0.4 + liftCoefficient(rearAngle) * 0.6;
}

/** Combined drag coefficient from front + rear wing */
export function totalDragCoefficient(frontAngle: number, rearAngle: number): number {
  return dragCoefficient(frontAngle) * 0.3 + dragCoefficient(rearAngle) * 0.7;
}

/**
 * Downforce: F = 0.5 * ρ * v² * Cl * A
 * @param speedMs - speed in m/s
 * @param cl - lift coefficient
 */
export function downforce(speedMs: number, cl: number): number {
  return 0.5 * AIR_DENSITY * speedMs * speedMs * cl * REFERENCE_AREA;
}

/**
 * Drag force: F = 0.5 * ρ * v² * Cd * A
 * @param speedMs - speed in m/s
 * @param cd - drag coefficient
 */
export function dragForce(speedMs: number, cd: number): number {
  return 0.5 * AIR_DENSITY * speedMs * speedMs * cd * REFERENCE_AREA;
}

/** Aerodynamic efficiency (L/D ratio) */
export function aeroEfficiency(cl: number, cd: number): number {
  if (cd === 0) return 0;
  return cl / cd;
}

/** Theoretical top speed limited by drag vs power */
export function theoreticalTopSpeed(powerWatts: number, cd: number): number {
  // P = F_drag * v = 0.5 * ρ * v³ * Cd * A
  // v = (2P / (ρ * Cd * A))^(1/3)
  const v = Math.pow((2 * powerWatts) / (AIR_DENSITY * cd * REFERENCE_AREA), 1 / 3);
  return v;
}

// === TIRE PHYSICS ===

/**
 * Tire grip as function of pressure (optimal around 23 PSI)
 * Returns friction coefficient multiplier (0.8 to 1.0)
 */
export function tirePressureGrip(pressurePsi: number): number {
  const optimal = 23;
  const deviation = Math.abs(pressurePsi - optimal);
  return Math.max(0.75, 1.0 - 0.008 * deviation * deviation);
}

/**
 * Maximum cornering speed: v = sqrt(μ * g * r)
 * @param mu - friction coefficient
 * @param radiusM - corner radius in meters
 * @param downforceN - additional downforce in Newtons
 * @param massKg - car mass in kg
 */
export function maxCornerSpeed(mu: number, radiusM: number, downforceN: number, massKg: number): number {
  // Effective grip includes mechanical grip + aero grip
  // F_grip = μ * (m*g + F_downforce)
  // F_centripetal = m * v² / r
  // μ * (m*g + F_down) = m * v² / r
  // v = sqrt(μ * r * (g + F_down/m))
  const effectiveG = GRAVITY + downforceN / massKg;
  return Math.sqrt(mu * radiusM * effectiveG);
}

/** Grip circle: combined longitudinal and lateral grip */
export function gripCircleUsage(longitudinal: number, lateral: number, maxGrip: number): number {
  return Math.sqrt(longitudinal * longitudinal + lateral * lateral) / maxGrip;
}

// === SUSPENSION & DYNAMICS ===

/**
 * Weight transfer under braking
 * ΔW = m * a * h / L
 * @param massKg - car mass
 * @param decelMs2 - deceleration in m/s²
 * @param cgHeightM - center of gravity height
 * @param wheelbaseM - wheelbase length
 */
export function weightTransfer(massKg: number, decelMs2: number, cgHeightM: number, wheelbaseM: number): number {
  return massKg * decelMs2 * cgHeightM / wheelbaseM;
}

/**
 * Natural frequency of suspension
 * f = (1/2π) * sqrt(k/m)
 */
export function suspensionFrequency(springRateNm: number, massKg: number): number {
  return (1 / (2 * Math.PI)) * Math.sqrt(springRateNm / massKg);
}

// === POWERTRAIN ===

/**
 * Power from torque and RPM
 * P = T * ω = T * RPM * 2π/60
 */
export function powerFromTorque(torqueNm: number, rpm: number): number {
  return torqueNm * rpm * 2 * Math.PI / 60;
}

/**
 * Kinetic energy (for ERS harvesting)
 * E = 0.5 * m * v²
 */
export function kineticEnergy(massKg: number, speedMs: number): number {
  return 0.5 * massKg * speedMs * speedMs;
}

/**
 * Engine torque curve (simplified model)
 * Peaks around 10,500 RPM for F1-like engine
 */
export function engineTorque(rpm: number): number {
  const peakRpm = 10500;
  const peakTorque = 350; // Nm
  const normalizedRpm = rpm / peakRpm;
  // Bell curve shape
  return peakTorque * Math.exp(-2 * (normalizedRpm - 1) * (normalizedRpm - 1)) * normalizedRpm;
}

/**
 * Engine power curve derived from torque
 */
export function enginePower(rpm: number): number {
  return powerFromTorque(engineTorque(rpm), rpm);
}

// === STRATEGY ===

/**
 * Tire degradation model
 * Lap time increase per lap: base_deg * lap^1.3
 */
export function tireDegradation(lap: number, compound: 'soft' | 'medium' | 'hard'): number {
  const baseDeg: Record<string, number> = { soft: 0.08, medium: 0.04, hard: 0.025 };
  return baseDeg[compound] * Math.pow(lap, 1.3);
}

/**
 * Fuel effect on lap time
 * ~0.03s per kg of fuel
 */
export function fuelEffect(fuelKg: number): number {
  return fuelKg * 0.03;
}

/**
 * Pit stop time loss (including pit lane speed limit)
 */
export function pitStopLoss(pitCrewTimeS: number = 2.5): number {
  return 20 + pitCrewTimeS; // 20s pit lane transit + crew time
}

// === UTILITY ===

export function kphToMs(kph: number): number {
  return kph / 3.6;
}

export function msToKph(ms: number): number {
  return ms * 3.6;
}

export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export { AIR_DENSITY, GRAVITY, REFERENCE_AREA };
