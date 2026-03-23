import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getXPProgress, getRankColor, XP_REWARDS } from '../utils/xp';
import { challenges } from '../data/challenges';
import QuizModal from './shared/QuizModal';
import XPPopup from './shared/XPPopup';

const roleCards = [
  {
    id: 'race-engineer' as const,
    name: 'Race Engineer',
    icon: '🏎️',
    color: '#ef4444',
    desc: 'Set up the car — tune wing angles, tire pressures, suspension, and brakes. Simulate laps and find the fastest setup.',
    skills: ['Car Setup', 'Tire Physics', 'Suspension', 'Grip Circle'],
  },
  {
    id: 'aero-engineer' as const,
    name: 'Aero Engineer',
    icon: '💨',
    color: '#3b82f6',
    desc: 'Design wing profiles and master the trade-off between downforce and drag. Real aerodynamics formulas.',
    skills: ['Downforce', 'Drag', 'L/D Ratio', 'Wing Design'],
  },
  {
    id: 'data-analyst' as const,
    name: 'Data Analyst',
    icon: '📊',
    color: '#22d3ee',
    desc: 'Read telemetry charts, compare driver performances, and identify where time is being lost on track.',
    skills: ['Telemetry', 'Speed Traces', 'Braking Analysis', 'Sector Comparison'],
  },
  {
    id: 'strategy-engineer' as const,
    name: 'Strategy Engineer',
    icon: '🧠',
    color: '#f59e0b',
    desc: 'Plan pit stops, choose tire compounds, and optimize race strategy. Every second counts!',
    skills: ['Pit Strategy', 'Tire Degradation', 'Undercut/Overcut', 'Fuel Management'],
  },
  {
    id: 'powertrain-engineer' as const,
    name: 'Powertrain Engineer',
    icon: '⚡',
    color: '#22c55e',
    desc: 'Master engines and hybrid power. Understand torque, power curves, and energy recovery systems (ERS).',
    skills: ['Power Curves', 'ERS', 'Fuel Efficiency', 'Thermal Efficiency'],
  },
];

export default function Dashboard() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const xpProgress = getXPProgress(state.xp);
  const rankColor = getRankColor(state.rank);

  const [dailyChallenge] = useState(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return challenges[dayOfYear % challenges.length];
  });
  const [showDaily, setShowDaily] = useState(false);
  const [xpPopup, setXpPopup] = useState<number | null>(null);

  const handleDailyAnswer = useCallback((correct: boolean) => {
    const xp = correct ? XP_REWARDS.CHALLENGE_CORRECT : XP_REWARDS.CHALLENGE_ATTEMPT;
    dispatch({ type: 'ADD_XP', amount: xp });
    dispatch({ type: 'COMPLETE_CHALLENGE', challengeId: dailyChallenge.id, correct, roleId: dailyChallenge.roleId });
    if (correct && !state.badges.includes('first-challenge')) {
      dispatch({ type: 'EARN_BADGE', badgeId: 'first-challenge' });
    }
    setXpPopup(xp);
  }, [dispatch, dailyChallenge, state.badges]);

  const totalSims = Object.values(state.roleProgress).reduce((a, r) => a + r.simulationsRun, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {xpPopup && <XPPopup amount={xpPopup} onDone={() => setXpPopup(null)} />}
      {showDaily && (
        <QuizModal
          challenge={dailyChallenge}
          onAnswer={handleDailyAnswer}
          onClose={() => setShowDaily(false)}
        />
      )}

      {/* Hero */}
      <div className="mb-8 checkered-accent rounded-xl p-6 border border-racing-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-black text-white mb-1">
              Welcome to the Pit Wall
            </h2>
            <p className="text-slate-400">
              Level {state.level} &middot;{' '}
              <span style={{ color: rankColor }} className="font-semibold">{state.rank}</span>
            </p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-2xl font-black text-white">{state.totalChallengesCorrect}</div>
              <div className="text-xs text-slate-500">Solved</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white">{totalSims}</div>
              <div className="text-xs text-slate-500">Simulations</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white">{state.currentStreak}</div>
              <div className="text-xs text-slate-500">Day Streak</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white">{state.badges.length}</div>
              <div className="text-xs text-slate-500">Badges</div>
            </div>
          </div>
        </div>
        {/* XP Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Level {state.level}</span>
            <span>{xpProgress.current} / {xpProgress.needed} XP</span>
            <span>Level {state.level + 1}</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-xp-bar to-accent-cyan rounded-full transition-all duration-700"
              style={{ width: `${xpProgress.percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Daily Challenge */}
      <div className="mb-8">
        <button
          onClick={() => setShowDaily(true)}
          className="w-full bg-gradient-to-r from-xp-bar/20 to-accent-cyan/20 border border-xp-bar/30 rounded-xl p-4 text-left hover:border-xp-bar/60 transition-all card-glow"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-xp-bar font-bold uppercase">Daily Challenge</span>
              <h3 className="text-white font-bold mt-1">{dailyChallenge.title}</h3>
              <p className="text-slate-400 text-sm mt-0.5">{dailyChallenge.description}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-accent-amber">{dailyChallenge.difficulty}</span>
              <div className="text-xp-bar font-bold">+{dailyChallenge.xpReward} XP</div>
            </div>
          </div>
        </button>
      </div>

      {/* Role Cards */}
      <h3 className="text-lg font-bold text-white mb-4">Choose Your Role</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {roleCards.map(role => {
          const progress = state.roleProgress[role.id];
          const totalActivity = progress.simulationsRun + progress.challengesCompleted;

          return (
            <button
              key={role.id}
              onClick={() => navigate(`/${role.id}`)}
              className="bg-racing-panel border border-racing-border rounded-xl p-5 text-left hover:border-opacity-60 transition-all card-glow group"
              style={{ borderColor: `${role.color}30` }}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{role.icon}</span>
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${role.color}20`, color: role.color }}
                >
                  {totalActivity} activities
                </span>
              </div>
              <h4 className="text-white font-bold mb-1 group-hover:underline">{role.name}</h4>
              <p className="text-slate-400 text-xs mb-3 leading-relaxed">{role.desc}</p>
              <div className="flex flex-wrap gap-1">
                {role.skills.map(skill => (
                  <span
                    key={skill}
                    className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Tips */}
      <div className="bg-racing-panel border border-racing-border rounded-xl p-5">
        <h3 className="text-white font-bold mb-3">🏁 How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-400">
          <div>
            <span className="text-accent-cyan font-bold">1. Pick a Role</span>
            <p className="mt-1">Each role teaches different motorsport engineering skills using real physics and maths.</p>
          </div>
          <div>
            <span className="text-accent-amber font-bold">2. Solve & Simulate</span>
            <p className="mt-1">Run simulations, solve engineering challenges, and see how real formulas work in practice.</p>
          </div>
          <div>
            <span className="text-accent-green font-bold">3. Level Up</span>
            <p className="mt-1">Earn XP, unlock badges, and progress from Junior Engineer to Technical Director!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
