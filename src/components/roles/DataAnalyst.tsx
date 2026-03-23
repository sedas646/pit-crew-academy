import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { tracks, getTrack } from '../../data/tracks';
import { generateTelemetry, findTimeLoss } from '../../utils/telemetry';
import { getChallengesByRole } from '../../data/challenges';
import { XP_REWARDS } from '../../utils/xp';
import Chart from '../shared/Chart';
import QuizModal from '../shared/QuizModal';
import XPPopup from '../shared/XPPopup';

export default function DataAnalyst() {
  const { state, dispatch } = useApp();
  const [trackId, setTrackId] = useState('silverstone');
  const [scenario, setScenario] = useState(0);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [xpPopup, setXpPopup] = useState<number | null>(null);

  const roleChallenges = getChallengesByRole('data-analyst');
  const unsolvedChallenges = roleChallenges.filter(c => !state.completedChallenges.includes(c.id));
  const currentChallenge = unsolvedChallenges[0] || roleChallenges[0];

  const track = getTrack(trackId);

  const { driverA, driverB, losses } = useMemo(() => {
    const a = generateTelemetry(track, 'good', scenario * 100 + 1);
    const b = generateTelemetry(track, scenario % 2 === 0 ? 'average' : 'poor', scenario * 100 + 2);
    const l = findTimeLoss(a, b);
    return { driverA: a, driverB: b, losses: l };
  }, [track, scenario]);

  // Chart datasets
  const speedChart = useMemo(() => [
    { label: 'Driver A', color: '#22d3ee', points: driverA.map(p => ({ x: p.distance, y: p.speed })) },
    { label: 'Driver B', color: '#ef4444', points: driverB.map(p => ({ x: p.distance, y: p.speed })) },
  ], [driverA, driverB]);

  const throttleChart = useMemo(() => [
    { label: 'Driver A Throttle', color: '#22c55e', points: driverA.map(p => ({ x: p.distance, y: p.throttle })) },
    { label: 'Driver B Throttle', color: '#f59e0b', points: driverB.map(p => ({ x: p.distance, y: p.throttle })) },
  ], [driverA, driverB]);

  const brakeChart = useMemo(() => [
    { label: 'Driver A Brake', color: '#3b82f6', points: driverA.map(p => ({ x: p.distance, y: p.brake })) },
    { label: 'Driver B Brake', color: '#ef4444', points: driverB.map(p => ({ x: p.distance, y: p.brake })) },
  ], [driverA, driverB]);

  const gearChart = useMemo(() => [
    { label: 'Driver A Gear', color: '#8b5cf6', points: driverA.map(p => ({ x: p.distance, y: p.gear })) },
  ], [driverA]);

  function handleAnalyze() {
    setShowAnalysis(true);
    dispatch({ type: 'RUN_SIMULATION', roleId: 'data-analyst' });
    dispatch({ type: 'ADD_XP', amount: XP_REWARDS.ANALYSIS_COMPLETE });
    setXpPopup(XP_REWARDS.ANALYSIS_COMPLETE);

    const totalAnalyses = state.roleProgress['data-analyst'].simulationsRun + 1;
    if (totalAnalyses >= 10 && !state.badges.includes('data-driven')) {
      dispatch({ type: 'EARN_BADGE', badgeId: 'data-driven' });
    }
  }

  function nextScenario() {
    setScenario(s => s + 1);
    setShowAnalysis(false);
  }

  const handleChallengeAnswer = useCallback((correct: boolean) => {
    const xp = correct ? currentChallenge.xpReward : XP_REWARDS.CHALLENGE_ATTEMPT;
    dispatch({ type: 'ADD_XP', amount: xp });
    dispatch({ type: 'COMPLETE_CHALLENGE', challengeId: currentChallenge.id, correct, roleId: 'data-analyst' });
    setXpPopup(xp);
  }, [currentChallenge, dispatch]);

  return (
    <div className="p-6">
      {xpPopup && <XPPopup amount={xpPopup} onDone={() => setXpPopup(null)} />}
      {showChallenge && currentChallenge && (
        <QuizModal challenge={currentChallenge} onAnswer={handleChallengeAnswer} onClose={() => setShowChallenge(false)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-white">📊 Data Analyst</h2>
          <p className="text-slate-400 text-sm">Analyze telemetry and find where time is being lost</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowChallenge(true)}
            className="px-4 py-2 bg-role-data text-slate-900 rounded-lg font-semibold hover:bg-role-data/80 transition-colors text-sm"
          >
            Data Challenge ({unsolvedChallenges.length})
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-racing-panel border border-racing-border rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <select
              value={trackId}
              onChange={e => { setTrackId(e.target.value); setShowAnalysis(false); }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-role-data"
            >
              {tracks.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div className="text-sm text-slate-400">
              Scenario #{scenario + 1} &middot; Comparing <span className="text-accent-cyan font-bold">Driver A</span> vs <span className="text-racing-red font-bold">Driver B</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={nextScenario}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600 transition-colors"
            >
              New Scenario
            </button>
            <button
              onClick={handleAnalyze}
              className="px-4 py-2 bg-role-data text-slate-900 rounded-lg font-bold text-sm hover:bg-role-data/80 transition-colors"
            >
              🔍 Analyze Data
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Charts */}
      <div className="space-y-4">
        <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
          <h3 className="text-white font-bold mb-1">Speed Trace</h3>
          <p className="text-xs text-slate-500 mb-3">Compare speed at every point on the lap. Look for where the lines diverge — that's where time is won or lost.</p>
          <Chart datasets={speedChart} height={250} xLabel="Distance (m)" yLabel="Speed (kph)" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-1">Throttle Application</h3>
            <p className="text-xs text-slate-500 mb-3">100% = full throttle. Look for earlier or smoother throttle from the faster driver.</p>
            <Chart datasets={throttleChart} height={180} xLabel="Distance (m)" yLabel="Throttle %" yMax={100} />
          </div>
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-1">Brake Pressure</h3>
            <p className="text-xs text-slate-500 mb-3">Later braking = braver driver. But brake too late and you miss the corner!</p>
            <Chart datasets={brakeChart} height={180} xLabel="Distance (m)" yLabel="Brake %" yMax={100} />
          </div>
        </div>

        <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
          <h3 className="text-white font-bold mb-1">Gear Usage (Driver A)</h3>
          <p className="text-xs text-slate-500 mb-3">Gear changes show corner entry (downshifts) and exit (upshifts).</p>
          <Chart datasets={gearChart} height={150} xLabel="Distance (m)" yLabel="Gear" yMax={9} />
        </div>

        {/* Analysis Results */}
        {showAnalysis && (
          <div className="bg-racing-panel border border-accent-cyan/30 rounded-xl p-4 slide-in">
            <h3 className="text-white font-bold mb-3">🔍 Analysis Report</h3>
            {losses.length === 0 ? (
              <p className="text-slate-400 text-sm">Both drivers are performing similarly. Try a new scenario for more contrast.</p>
            ) : (
              <>
                <p className="text-slate-400 text-sm mb-3">
                  Found <span className="text-accent-cyan font-bold">{losses.length}</span> areas where Driver B is losing time:
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {losses.slice(0, 15).map((loss, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-900 rounded-lg px-3 py-2 text-sm">
                      <span className="text-racing-red font-mono text-xs w-16">
                        {driverB[loss.index]?.distance || 0}m
                      </span>
                      <span className="text-accent-amber font-bold">-{loss.speedDiff} kph</span>
                      <span className="text-slate-400">{loss.reason}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-slate-900 rounded-lg p-3">
                  <h4 className="text-sm font-bold text-accent-cyan mb-2">Summary</h4>
                  <div className="grid grid-cols-3 gap-3 text-center text-sm">
                    <div>
                      <div className="text-slate-500 text-xs">Braking issues</div>
                      <div className="text-racing-red font-bold">{losses.filter(l => l.reason.includes('brak')).length}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-xs">Throttle issues</div>
                      <div className="text-accent-amber font-bold">{losses.filter(l => l.reason.includes('throttle')).length}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-xs">Grip issues</div>
                      <div className="text-accent-green font-bold">{losses.filter(l => l.reason.includes('grip')).length}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Educational Notes */}
        <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
          <h3 className="text-white font-bold mb-2">📚 How to Read Telemetry</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
            <div>
              <span className="text-accent-cyan font-bold">Speed Trace:</span> The main chart. Where Driver A's line is above Driver B's, A is faster. Big dips = heavy braking zones (corners).
            </div>
            <div>
              <span className="text-accent-green font-bold">Throttle:</span> 100% means full power. The faster driver often gets back on throttle earlier after corners ("early throttle application").
            </div>
            <div>
              <span className="text-role-aero font-bold">Braking:</span> High spikes show braking zones. Braking later (spike appears later on the x-axis) is faster, but riskier.
            </div>
            <div>
              <span className="text-xp-bar font-bold">Gears:</span> Downshifts to 2nd/3rd = slow corners. Staying in 7th/8th = fast sections. Gear changes should be smooth and decisive.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
