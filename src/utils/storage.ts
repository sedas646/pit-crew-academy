import type { UserState, RoleId } from '../types';

const STORAGE_KEY = 'pit-crew-academy-state';

const defaultRoleProgress = () => ({
  challengesCompleted: 0,
  simulationsRun: 0,
  conceptsLearned: [],
  bestScores: {},
});

export const defaultState: UserState = {
  xp: 0,
  level: 1,
  rank: 'Junior Engineer',
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: '',
  roleProgress: {
    'race-engineer': defaultRoleProgress(),
    'aero-engineer': defaultRoleProgress(),
    'data-analyst': defaultRoleProgress(),
    'strategy-engineer': defaultRoleProgress(),
    'powertrain-engineer': defaultRoleProgress(),
  },
  completedChallenges: [],
  badges: [],
  savedSetups: [],
  totalChallengesAttempted: 0,
  totalChallengesCorrect: 0,
};

export function loadState(): UserState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    // Merge with defaults to handle new fields
    return { ...defaultState, ...parsed, roleProgress: { ...defaultState.roleProgress, ...parsed.roleProgress } };
  } catch {
    return { ...defaultState };
  }
}

export function saveState(state: UserState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable
  }
}

export function getRoleIds(): RoleId[] {
  return ['race-engineer', 'aero-engineer', 'data-analyst', 'strategy-engineer', 'powertrain-engineer'];
}
