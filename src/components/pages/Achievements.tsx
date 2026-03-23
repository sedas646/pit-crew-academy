import { useApp } from '../../context/AppContext';
import { allBadges } from '../../data/badges';
import { getRankColor } from '../../utils/xp';

export default function Achievements() {
  const { state } = useApp();
  const rankColor = getRankColor(state.rank);

  const earned = allBadges.filter(b => state.badges.includes(b.id));
  const locked = allBadges.filter(b => !state.badges.includes(b.id));

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-black text-white mb-6">🏆 Achievements</h2>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <div className="bg-racing-panel border border-racing-border rounded-xl p-4 text-center">
          <div className="text-2xl font-black" style={{ color: rankColor }}>{state.rank}</div>
          <div className="text-xs text-slate-500 mt-1">Current Rank</div>
        </div>
        <div className="bg-racing-panel border border-racing-border rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-xp-bar">{state.xp}</div>
          <div className="text-xs text-slate-500 mt-1">Total XP</div>
        </div>
        <div className="bg-racing-panel border border-racing-border rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-white">{state.level}</div>
          <div className="text-xs text-slate-500 mt-1">Level</div>
        </div>
        <div className="bg-racing-panel border border-racing-border rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-accent-amber">{state.longestStreak}</div>
          <div className="text-xs text-slate-500 mt-1">Best Streak</div>
        </div>
        <div className="bg-racing-panel border border-racing-border rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-accent-green">
            {state.totalChallengesAttempted > 0
              ? Math.round((state.totalChallengesCorrect / state.totalChallengesAttempted) * 100)
              : 0}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Accuracy</div>
        </div>
      </div>

      {/* Earned Badges */}
      {earned.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-white mb-3">Earned ({earned.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {earned.map(badge => (
              <div key={badge.id} className="bg-racing-panel border border-accent-green/30 rounded-xl p-4 card-glow">
                <div className="flex items-center gap-3">
                  <span className="text-3xl badge-unlock">{badge.icon}</span>
                  <div>
                    <h4 className="text-white font-bold text-sm">{badge.name}</h4>
                    <p className="text-slate-400 text-xs">{badge.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Locked ({locked.length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {locked.map(badge => (
            <div key={badge.id} className="bg-racing-panel border border-racing-border rounded-xl p-4 opacity-50">
              <div className="flex items-center gap-3">
                <span className="text-3xl grayscale">{badge.icon}</span>
                <div>
                  <h4 className="text-slate-400 font-bold text-sm">{badge.name}</h4>
                  <p className="text-slate-500 text-xs">{badge.condition}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Progress */}
      <h3 className="text-lg font-bold text-white mt-8 mb-3">Role Progress</h3>
      <div className="space-y-3">
        {([
          { id: 'race-engineer', name: 'Race Engineer', icon: '🏎️', color: '#ef4444' },
          { id: 'aero-engineer', name: 'Aero Engineer', icon: '💨', color: '#3b82f6' },
          { id: 'data-analyst', name: 'Data Analyst', icon: '📊', color: '#22d3ee' },
          { id: 'strategy-engineer', name: 'Strategy Engineer', icon: '🧠', color: '#f59e0b' },
          { id: 'powertrain-engineer', name: 'Powertrain Engineer', icon: '⚡', color: '#22c55e' },
        ] as const).map(role => {
          const progress = state.roleProgress[role.id];
          return (
            <div key={role.id} className="bg-racing-panel border border-racing-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{role.icon}</span>
                  <span className="text-white font-bold">{role.name}</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-slate-400">
                    <span className="text-white font-mono">{progress.simulationsRun}</span> sims
                  </span>
                  <span className="text-slate-400">
                    <span className="text-white font-mono">{progress.challengesCompleted}</span> challenges
                  </span>
                </div>
              </div>
              {Object.entries(progress.bestScores).length > 0 && (
                <div className="flex gap-3 mt-2 text-xs text-slate-500">
                  {Object.entries(progress.bestScores).map(([key, val]) => (
                    <span key={key}>
                      {key}: <span className="text-accent-green font-mono">{val}s</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
