import type { RankTitle } from '../types';

export const XP_REWARDS = {
  SIMULATION_RUN: 15,
  CHALLENGE_ATTEMPT: 10,
  CHALLENGE_CORRECT: 30,
  CHALLENGE_PERFECT: 50,
  CONCEPT_LEARNED: 20,
  DAILY_CHALLENGE: 25,
  SETUP_SAVED: 10,
  LAP_RECORD: 40,
  ANALYSIS_COMPLETE: 25,
} as const;

export const XP_PER_LEVEL = 400;

const RANK_THRESHOLDS: [number, RankTitle][] = [
  [1, 'Junior Engineer'],
  [5, 'Engineer'],
  [10, 'Senior Engineer'],
  [18, 'Lead Engineer'],
  [28, 'Principal Engineer'],
  [40, 'Chief Engineer'],
  [55, 'Technical Director'],
];

export function getLevelFromXP(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function getXPProgress(xp: number): { current: number; needed: number; percent: number } {
  const current = xp % XP_PER_LEVEL;
  return {
    current,
    needed: XP_PER_LEVEL,
    percent: (current / XP_PER_LEVEL) * 100,
  };
}

export function getRankFromLevel(level: number): RankTitle {
  let rank: RankTitle = 'Junior Engineer';
  for (const [threshold, title] of RANK_THRESHOLDS) {
    if (level >= threshold) rank = title;
  }
  return rank;
}

export function getNextRank(level: number): { title: RankTitle; levelsAway: number } | null {
  for (const [threshold, title] of RANK_THRESHOLDS) {
    if (level < threshold) {
      return { title, levelsAway: threshold - level };
    }
  }
  return null;
}

export function getRankColor(rank: RankTitle): string {
  const colors: Record<RankTitle, string> = {
    'Junior Engineer': '#94a3b8',
    'Engineer': '#22d3ee',
    'Senior Engineer': '#3b82f6',
    'Lead Engineer': '#8b5cf6',
    'Principal Engineer': '#f59e0b',
    'Chief Engineer': '#ef4444',
    'Technical Director': '#f97316',
  };
  return colors[rank];
}
