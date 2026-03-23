export type RoleId = 'race-engineer' | 'aero-engineer' | 'data-analyst' | 'strategy-engineer' | 'powertrain-engineer';

export type RankTitle = 'Junior Engineer' | 'Engineer' | 'Senior Engineer' | 'Lead Engineer' | 'Principal Engineer' | 'Chief Engineer' | 'Technical Director';

export type Difficulty = 'rookie' | 'intermediate' | 'advanced' | 'expert';

export interface RoleProgress {
  challengesCompleted: number;
  simulationsRun: number;
  conceptsLearned: string[];
  bestScores: Record<string, number>;
}

export interface CarSetup {
  id: string;
  name: string;
  trackId: string;
  date: string;
  frontWingAngle: number;
  rearWingAngle: number;
  tirePressureFront: number;
  tirePressureRear: number;
  suspensionStiffness: number;
  brakeBalance: number;
  fuelLoad: number;
  ersDeployMode: number;
  lapTime?: number;
}

export interface UserState {
  xp: number;
  level: number;
  rank: RankTitle;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  roleProgress: Record<RoleId, RoleProgress>;
  completedChallenges: string[];
  badges: string[];
  savedSetups: CarSetup[];
  totalChallengesAttempted: number;
  totalChallengesCorrect: number;
}

export interface Sector {
  type: 'straight' | 'slow-corner' | 'medium-corner' | 'fast-corner';
  lengthM: number;
  name: string;
}

export interface Track {
  id: string;
  name: string;
  country: string;
  lengthKm: number;
  sectors: Sector[];
  referenceTime: number;
}

export interface TelemetryPoint {
  distance: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  lateralG: number;
  drs: boolean;
}

export interface Challenge {
  id: string;
  roleId: RoleId;
  title: string;
  description: string;
  difficulty: Difficulty;
  xpReward: number;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  formula?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
}

export interface SimulationResult {
  totalTime: number;
  sectorTimes: number[];
  topSpeed: number;
  avgCornerSpeed: number;
  downforce: number;
  drag: number;
  feedback: string[];
}

export interface ChartData {
  label: string;
  color: string;
  points: { x: number; y: number }[];
}
