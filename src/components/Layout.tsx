import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getXPProgress, getRankColor, getNextRank } from '../utils/xp';

const roles = [
  { id: 'race-engineer', name: 'Race Engineer', icon: '🏎️', color: '#ef4444' },
  { id: 'aero-engineer', name: 'Aero Engineer', icon: '💨', color: '#3b82f6' },
  { id: 'data-analyst', name: 'Data Analyst', icon: '📊', color: '#22d3ee' },
  { id: 'strategy-engineer', name: 'Strategy', icon: '🧠', color: '#f59e0b' },
  { id: 'powertrain-engineer', name: 'Powertrain', icon: '⚡', color: '#22c55e' },
];

export default function Layout() {
  const { state } = useApp();
  const location = useLocation();
  const xpProgress = getXPProgress(state.xp);
  const rankColor = getRankColor(state.rank);
  const nextRank = getNextRank(state.level);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  // Get current page title for mobile header
  const getPageTitle = () => {
    const path = location.pathname.replace('/', '');
    if (!path) return 'Dashboard';
    return path.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-racing-border checkered-accent">
        <NavLink to="/" className="block" onClick={closeSidebar}>
          <h1 className="text-lg font-black text-white tracking-tight leading-tight">
            🏁 PIT CREW<br />
            <span className="text-racing-red">ACADEMY</span>
          </h1>
        </NavLink>
      </div>

      {/* Rank & XP */}
      <div className="p-4 border-b border-racing-border">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-full pulse-dot"
            style={{ backgroundColor: rankColor }}
          />
          <span className="text-sm font-bold" style={{ color: rankColor }}>
            {state.rank}
          </span>
        </div>
        <div className="text-xs text-slate-400 mb-1">
          Level {state.level} &middot; {state.xp} XP
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-xp-bar rounded-full transition-all duration-500"
            style={{ width: `${xpProgress.percent}%` }}
          />
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {xpProgress.current}/{xpProgress.needed} XP to Level {state.level + 1}
          {nextRank && (
            <span className="block mt-0.5">
              {nextRank.levelsAway} levels to {nextRank.title}
            </span>
          )}
        </div>
      </div>

      {/* Role Navigation */}
      <div className="flex-1 overflow-y-auto py-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`
          }
          onClick={closeSidebar}
        >
          <span>🏠</span>
          <span>Dashboard</span>
        </NavLink>

        <div className="px-4 py-2 text-xs text-slate-500 uppercase tracking-wider font-semibold">
          Roles
        </div>

        {roles.map(role => (
          <NavLink
            key={role.id}
            to={`/${role.id}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`
            }
            style={({ isActive }) => isActive ? { backgroundColor: `${role.color}15`, borderRight: `3px solid ${role.color}` } : {}}
            onClick={closeSidebar}
          >
            <span>{role.icon}</span>
            <span>{role.name}</span>
            <span className="ml-auto text-xs text-slate-500">
              {state.roleProgress[role.id as keyof typeof state.roleProgress]?.simulationsRun || 0}
            </span>
          </NavLink>
        ))}

        <div className="px-4 py-2 text-xs text-slate-500 uppercase tracking-wider font-semibold mt-2">
          Learn & Play
        </div>

        <NavLink
          to="/car-builder"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`
          }
          onClick={closeSidebar}
        >
          <span>🔧</span>
          <span>Car Builder</span>
        </NavLink>

        <NavLink
          to="/race-weekend"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`
          }
          onClick={closeSidebar}
        >
          <span>🏁</span>
          <span>Race Weekend</span>
        </NavLink>

        <NavLink
          to="/pit-stop-games"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`
          }
          onClick={closeSidebar}
        >
          <span>🎮</span>
          <span>Pit Stop Games</span>
        </NavLink>

        <div className="px-4 py-2 text-xs text-slate-500 uppercase tracking-wider font-semibold mt-2">
          Progress
        </div>

        <NavLink
          to="/achievements"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`
          }
          onClick={closeSidebar}
        >
          <span>🏆</span>
          <span>Achievements</span>
          <span className="ml-auto text-xs text-slate-500">{state.badges.length}</span>
        </NavLink>

        <NavLink
          to="/learn"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`
          }
          onClick={closeSidebar}
        >
          <span>📚</span>
          <span>Learn</span>
        </NavLink>
      </div>

      {/* Stats Footer */}
      <div className="p-4 border-t border-racing-border text-xs text-slate-500">
        <div className="flex justify-between mb-1">
          <span>Challenges</span>
          <span className="text-slate-300">{state.totalChallengesCorrect}/{state.totalChallengesAttempted}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>Streak</span>
          <span className="text-slate-300">{state.currentStreak} days 🔥</span>
        </div>
        <div className="flex justify-between">
          <span>Accuracy</span>
          <span className="text-slate-300">
            {state.totalChallengesAttempted > 0
              ? Math.round((state.totalChallengesCorrect / state.totalChallengesAttempted) * 100)
              : 0}%
          </span>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 border-b border-racing-border bg-racing-panel px-4 py-3 md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"
          aria-label="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="5" x2="17" y2="5" />
            <line x1="3" y1="10" x2="17" y2="10" />
            <line x1="3" y1="15" x2="17" y2="15" />
          </svg>
        </button>
        <span className="text-sm font-bold text-white">{getPageTitle()}</span>
        <span className="ml-auto text-xs font-bold" style={{ color: rankColor }}>
          {state.rank}
        </span>
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-racing-panel border-r border-racing-border flex flex-col shrink-0
          transition-transform duration-200 ease-in-out
          md:static md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-racing-dark pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
