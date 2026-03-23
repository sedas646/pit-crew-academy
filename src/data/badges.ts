import type { Badge } from '../types';

export const allBadges: Badge[] = [
  { id: 'green-light', name: 'Green Light', description: 'Run your first simulation', icon: '🟢', condition: 'Run 1 simulation' },
  { id: 'pole-position', name: 'Pole Position', description: 'Beat a reference lap time', icon: '🏁', condition: 'Beat any track reference time' },
  { id: 'data-driven', name: 'Data Driven', description: 'Complete 10 telemetry analyses', icon: '📊', condition: '10 data analyst challenges' },
  { id: 'aero-genius', name: 'Aero Genius', description: 'Achieve L/D ratio above 4.0', icon: '💨', condition: 'L/D > 4.0 in aero lab' },
  { id: 'strategy-master', name: 'Strategy Master', description: 'Win 5 strategy challenges', icon: '🧠', condition: '5 strategy challenges correct' },
  { id: 'full-power', name: 'Full Power', description: 'Master ERS deployment', icon: '⚡', condition: '5 powertrain challenges correct' },
  { id: 'streak-3', name: 'Hat Trick', description: '3-day streak', icon: '🔥', condition: '3 day streak' },
  { id: 'streak-7', name: 'Race Week', description: '7-day streak', icon: '🏆', condition: '7 day streak' },
  { id: 'century', name: 'Century', description: 'Complete 100 challenges', icon: '💯', condition: '100 challenges completed' },
  { id: 'all-rounder', name: 'All-Rounder', description: 'Complete challenges in all 5 roles', icon: '⭐', condition: 'Challenge in every role' },
  { id: 'perfect-setup', name: 'Perfect Setup', description: 'Within 0.5s of best possible time', icon: '🎯', condition: 'Near-optimal lap time' },
  { id: 'pit-wall', name: 'Pit Wall', description: 'Solve 50 strategy problems', icon: '📋', condition: '50 strategy challenges' },
  { id: 'ten-sims', name: 'Sim Racer', description: 'Run 10 simulations', icon: '🖥️', condition: '10 simulations run' },
  { id: 'first-challenge', name: 'Rookie Test', description: 'Complete your first challenge', icon: '✅', condition: '1 challenge completed' },
  { id: 'five-correct', name: 'On Track', description: 'Get 5 challenges correct', icon: '🎉', condition: '5 correct answers' },
];

export function getBadge(id: string): Badge | undefined {
  return allBadges.find(b => b.id === id);
}
