import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { UserState, RoleId, CarSetup } from '../types';
import { loadState, saveState } from '../utils/storage';
import { getLevelFromXP, getRankFromLevel } from '../utils/xp';

type Action =
  | { type: 'ADD_XP'; amount: number }
  | { type: 'UPDATE_STREAK' }
  | { type: 'COMPLETE_CHALLENGE'; challengeId: string; correct: boolean; roleId: RoleId }
  | { type: 'RUN_SIMULATION'; roleId: RoleId }
  | { type: 'LEARN_CONCEPT'; roleId: RoleId; conceptId: string }
  | { type: 'SAVE_SETUP'; setup: CarSetup }
  | { type: 'SET_ROLE_BEST_SCORE'; roleId: RoleId; key: string; score: number }
  | { type: 'EARN_BADGE'; badgeId: string }
  | { type: 'RESET_STATE' };

function reducer(state: UserState, action: Action): UserState {
  switch (action.type) {
    case 'ADD_XP': {
      const newXp = state.xp + action.amount;
      const newLevel = getLevelFromXP(newXp);
      return { ...state, xp: newXp, level: newLevel, rank: getRankFromLevel(newLevel) };
    }
    case 'UPDATE_STREAK': {
      const today = new Date().toISOString().slice(0, 10);
      if (state.lastActiveDate === today) return state;
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const newStreak = state.lastActiveDate === yesterday ? state.currentStreak + 1 : 1;
      return {
        ...state,
        lastActiveDate: today,
        currentStreak: newStreak,
        longestStreak: Math.max(state.longestStreak, newStreak),
      };
    }
    case 'COMPLETE_CHALLENGE': {
      const rp = { ...state.roleProgress[action.roleId] };
      rp.challengesCompleted += 1;
      const completed = action.correct && !state.completedChallenges.includes(action.challengeId)
        ? [...state.completedChallenges, action.challengeId]
        : state.completedChallenges;
      return {
        ...state,
        roleProgress: { ...state.roleProgress, [action.roleId]: rp },
        completedChallenges: completed,
        totalChallengesAttempted: state.totalChallengesAttempted + 1,
        totalChallengesCorrect: state.totalChallengesCorrect + (action.correct ? 1 : 0),
      };
    }
    case 'RUN_SIMULATION': {
      const rp = { ...state.roleProgress[action.roleId] };
      rp.simulationsRun += 1;
      return { ...state, roleProgress: { ...state.roleProgress, [action.roleId]: rp } };
    }
    case 'LEARN_CONCEPT': {
      const rp = { ...state.roleProgress[action.roleId] };
      if (!rp.conceptsLearned.includes(action.conceptId)) {
        rp.conceptsLearned = [...rp.conceptsLearned, action.conceptId];
      }
      return { ...state, roleProgress: { ...state.roleProgress, [action.roleId]: rp } };
    }
    case 'SAVE_SETUP': {
      return { ...state, savedSetups: [...state.savedSetups, action.setup] };
    }
    case 'SET_ROLE_BEST_SCORE': {
      const rp = { ...state.roleProgress[action.roleId] };
      const current = rp.bestScores[action.key] ?? Infinity;
      if (action.score < current) {
        rp.bestScores = { ...rp.bestScores, [action.key]: action.score };
      }
      return { ...state, roleProgress: { ...state.roleProgress, [action.roleId]: rp } };
    }
    case 'EARN_BADGE': {
      if (state.badges.includes(action.badgeId)) return state;
      return { ...state, badges: [...state.badges, action.badgeId] };
    }
    case 'RESET_STATE': {
      return loadState();
    }
    default:
      return state;
  }
}

interface AppContextValue {
  state: UserState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Update streak on mount
  useEffect(() => {
    dispatch({ type: 'UPDATE_STREAK' });
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
