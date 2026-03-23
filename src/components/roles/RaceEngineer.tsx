import { useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { tracks, getTrack } from '../../data/tracks';
import { getChallengesByRole } from '../../data/challenges';
import { simulateLap, defaultSetup, findOptimalSetup, getSetupRecommendations, type HintDirection } from '../../utils/simulation';
import { round, downforce as calcDownforce, totalLiftCoefficient, totalDragCoefficient } from '../../utils/physics';
import { XP_REWARDS } from '../../utils/xp';
import type { CarSetup, SimulationResult } from '../../types';
import SliderInput from '../shared/SliderInput';
import FormulaCard from '../shared/FormulaCard';
import QuizModal from '../shared/QuizModal';
import XPPopup from '../shared/XPPopup';
import Chart from '../shared/Chart';

export default function RaceEngineer() {
  const { state, dispatch } = useApp();
  const [trackId, setTrackId] = useState('silverstone');
  const [setup, setSetup] = useState<CarSetup>(() => defaultSetup('silverstone'));
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [showChallenge, setShowChallenge] = useState(false);
  const [xpPopup, setXpPopup] = useState<number | null>(null);
  const [showFormulas, setShowFormulas] = useState(false);
  const [showTeachingTips, setShowTeachingTips] = useState(false);
  const [optimal, setOptimal] = useState<{ setup: import('../../types').CarSetup; lapTime: number; sectorTimes: number[] } | null>(null);

  const roleChallenges = getChallengesByRole('race-engineer');
  const unsolvedChallenges = roleChallenges.filter(c => !state.completedChallenges.includes(c.id));
  const currentChallenge = unsolvedChallenges[0] || roleChallenges[0];

  const update = useCallback((key: keyof CarSetup, value: number) => {
    setSetup(s => ({ ...s, [key]: value }));
    setResult(null);
  }, []);

  function handleSimulate() {
    const track = getTrack(trackId);
    const simResult = simulateLap({ ...setup, trackId }, track);
    setResult(simResult);
    setSetup(s => ({ ...s, lapTime: simResult.totalTime }));

    // Compute optimal for this track
    const opt = findOptimalSetup(track);
    setOptimal(opt);

    dispatch({ type: 'RUN_SIMULATION', roleId: 'race-engineer' });
    dispatch({ type: 'ADD_XP', amount: XP_REWARDS.SIMULATION_RUN });
    setXpPopup(XP_REWARDS.SIMULATION_RUN);

    // Check badges
    if (!state.badges.includes('green-light')) {
      dispatch({ type: 'EARN_BADGE', badgeId: 'green-light' });
    }
    const totalSims = state.roleProgress['race-engineer'].simulationsRun + 1;
    if (totalSims >= 10 && !state.badges.includes('ten-sims')) {
      dispatch({ type: 'EARN_BADGE', badgeId: 'ten-sims' });
    }

    // Check if beat reference time
    if (simResult.totalTime < track.referenceTime && !state.badges.includes('pole-position')) {
      dispatch({ type: 'EARN_BADGE', badgeId: 'pole-position' });
    }

    // Track best lap
    dispatch({ type: 'SET_ROLE_BEST_SCORE', roleId: 'race-engineer', key: trackId, score: simResult.totalTime });
  }

  function handleSaveSetup() {
    dispatch({ type: 'SAVE_SETUP', setup: { ...setup, id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10) } });
    dispatch({ type: 'ADD_XP', amount: XP_REWARDS.SETUP_SAVED });
    setXpPopup(XP_REWARDS.SETUP_SAVED);
  }

  function handleChallengeAnswer(correct: boolean) {
    const xp = correct ? currentChallenge.xpReward : XP_REWARDS.CHALLENGE_ATTEMPT;
    dispatch({ type: 'ADD_XP', amount: xp });
    dispatch({ type: 'COMPLETE_CHALLENGE', challengeId: currentChallenge.id, correct, roleId: 'race-engineer' });
    setXpPopup(xp);
  }

  const track = getTrack(trackId);
  const cl = totalLiftCoefficient(setup.frontWingAngle, setup.rearWingAngle);
  const cd = totalDragCoefficient(setup.frontWingAngle, setup.rearWingAngle);
  const dfAt200 = round(calcDownforce(55.6, cl), 0);
  const bestLap = state.roleProgress['race-engineer'].bestScores[trackId];

  return (
    <div className="p-6">
      {xpPopup && <XPPopup amount={xpPopup} onDone={() => setXpPopup(null)} />}
      {showChallenge && currentChallenge && (
        <QuizModal challenge={currentChallenge} onAnswer={handleChallengeAnswer} onClose={() => setShowChallenge(false)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-white">🏎️ Race Engineer</h2>
          <p className="text-slate-400 text-sm">Set up the car and simulate lap performance</p>
        </div>
        <button
          onClick={() => setShowChallenge(true)}
          className="px-4 py-2 bg-racing-red text-white rounded-lg font-semibold hover:bg-racing-red/80 transition-colors text-sm"
        >
          Engineering Challenge ({unsolvedChallenges.length} left)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Setup Panel */}
        <div className="lg:col-span-1">
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4 mb-4">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-racing-red" />
              Car Setup
            </h3>

            {/* Track Selector */}
            <div className="mb-4">
              <label className="text-sm text-slate-300 block mb-1">Track</label>
              <select
                value={trackId}
                onChange={e => { setTrackId(e.target.value); setResult(null); }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-xp-bar"
              >
                {tracks.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.country}) - {t.lengthKm}km</option>
                ))}
              </select>
              {bestLap && (
                <div className="text-xs text-accent-green mt-1">Best lap: {bestLap.toFixed(3)}s</div>
              )}
            </div>

            <SliderInput label="Front Wing Angle" value={setup.frontWingAngle} min={0} max={15} unit="°" color="#ef4444" onChange={v => update('frontWingAngle', v)} hint="More = more downforce + drag" />
            <SliderInput label="Rear Wing Angle" value={setup.rearWingAngle} min={0} max={25} unit="°" color="#ef4444" onChange={v => update('rearWingAngle', v)} hint="Bigger effect than front" />
            <SliderInput label="Front Tire Pressure" value={setup.tirePressureFront} min={18} max={28} step={0.5} unit=" PSI" color="#f59e0b" onChange={v => update('tirePressureFront', v)} hint="Optimal: ~23 PSI" />
            <SliderInput label="Rear Tire Pressure" value={setup.tirePressureRear} min={18} max={28} step={0.5} unit=" PSI" color="#f59e0b" onChange={v => update('tirePressureRear', v)} hint="Optimal: ~23 PSI" />
            <SliderInput label="Suspension Stiffness" value={setup.suspensionStiffness} min={10} max={90} unit="%" color="#3b82f6" onChange={v => update('suspensionStiffness', v)} hint="50% is balanced" />
            <SliderInput label="Brake Balance" value={setup.brakeBalance} min={50} max={70} unit="% front" color="#22d3ee" onChange={v => update('brakeBalance', v)} hint="Optimal: ~57%" />
            <SliderInput label="Fuel Load" value={setup.fuelLoad} min={5} max={110} unit=" kg" color="#22c55e" onChange={v => update('fuelLoad', v)} hint="Less = faster but shorter" />
            <SliderInput label="ERS Deploy" value={setup.ersDeployMode} min={0} max={5} color="#8b5cf6" onChange={v => update('ersDeployMode', v)} hint="0=none, 5=max power" />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSimulate}
              className="flex-1 py-3 bg-racing-red text-white rounded-xl font-black text-sm hover:bg-racing-red/90 transition-colors"
            >
              🏁 SIMULATE LAP
            </button>
            {result && (
              <button
                onClick={handleSaveSetup}
                className="px-4 py-3 bg-slate-700 text-white rounded-xl font-semibold text-sm hover:bg-slate-600 transition-colors"
              >
                💾 Save
              </button>
            )}
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          {/* Live Stats */}
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold">Live Aero Stats</h3>
              <button
                onClick={() => setShowFormulas(!showFormulas)}
                className="text-xs text-xp-bar hover:text-xp-bar/80"
              >
                {showFormulas ? 'Hide' : 'Show'} Formulas 📐
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-900 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-1">Cl (Lift Coeff)</div>
                <div className="text-xl font-mono font-bold text-accent-cyan">{round(cl, 3)}</div>
              </div>
              <div className="bg-slate-900 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-1">Cd (Drag Coeff)</div>
                <div className="text-xl font-mono font-bold text-accent-amber">{round(cd, 3)}</div>
              </div>
              <div className="bg-slate-900 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-1">Downforce @200kph</div>
                <div className="text-xl font-mono font-bold text-accent-green">{dfAt200}N</div>
              </div>
            </div>
          </div>

          {showFormulas && (
            <div className="mb-4">
              <FormulaCard
                title="Downforce"
                formula="F = ½ × ρ × v² × Cl × A"
                description="Force pushing the car onto the track. Increases with speed squared!"
                variables={[
                  { symbol: 'ρ', meaning: 'Air density', value: '1.225 kg/m³' },
                  { symbol: 'v', meaning: 'Speed', value: '55.6 m/s (200 kph)' },
                  { symbol: 'Cl', meaning: 'Lift coefficient', value: round(cl, 3).toString() },
                  { symbol: 'A', meaning: 'Frontal area', value: '1.5 m²' },
                ]}
                result={`${dfAt200} Newtons (${round(dfAt200 / 9.81, 1)} kg of force)`}
              />
              <FormulaCard
                title="Maximum Corner Speed"
                formula="v = √(μ × g × r)"
                description="How fast you can take a corner depends on grip and radius"
                variables={[
                  { symbol: 'μ', meaning: 'Friction coefficient' },
                  { symbol: 'g', meaning: 'Gravity', value: '9.81 m/s²' },
                  { symbol: 'r', meaning: 'Corner radius (m)' },
                ]}
              />
            </div>
          )}

          {/* Simulation Results */}
          {result ? (
            <div className="space-y-4">
              <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
                <h3 className="text-white font-bold mb-3">Lap Result</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-slate-900 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-500">Lap Time</div>
                    <div className="text-2xl font-mono font-black text-white">{result.totalTime.toFixed(3)}s</div>
                    {optimal && (() => {
                      const g = round(result.totalTime - optimal.lapTime, 3);
                      return (
                        <div className={`text-xs mt-1 font-bold ${g <= 0.3 ? 'text-accent-green' : g <= 1.0 ? 'text-accent-amber' : g <= 3.0 ? 'text-orange-400' : 'text-racing-red'}`}>
                          {g <= 0.3 ? '🏆' : g <= 1.0 ? '🔥' : g <= 3.0 ? '⚡' : '🔧'} +{g}s to optimal
                        </div>
                      );
                    })()}
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-500">Top Speed</div>
                    <div className="text-2xl font-mono font-bold text-accent-cyan">{result.topSpeed}</div>
                    <div className="text-xs text-slate-500">km/h</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-500">Avg Corner Speed</div>
                    <div className="text-2xl font-mono font-bold text-accent-amber">{result.avgCornerSpeed}</div>
                    <div className="text-xs text-slate-500">km/h</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-500">Downforce @250kph</div>
                    <div className="text-2xl font-mono font-bold text-accent-green">{result.downforce}N</div>
                    <div className="text-xs text-slate-500">Drag: {result.drag}N</div>
                  </div>
                </div>

                {/* Sector Times Chart */}
                <Chart
                  datasets={[{
                    label: 'Sector Times',
                    color: '#ef4444',
                    points: result.sectorTimes.map((t, i) => ({ x: i + 1, y: t })),
                  }]}
                  height={200}
                  xLabel="Sector"
                  yLabel="Time (s)"
                />
              </div>

              {/* Sector Breakdown */}
              <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
                <h3 className="text-white font-bold mb-3">Sector Breakdown</h3>
                <div className="space-y-1">
                  {track.sectors.map((sector, i) => {
                    const time = result.sectorTimes[i];
                    const maxTime = Math.max(...result.sectorTimes);
                    const percent = (time / maxTime) * 100;
                    const color = sector.type === 'straight' ? '#22d3ee' : sector.type === 'slow-corner' ? '#ef4444' : sector.type === 'medium-corner' ? '#f59e0b' : '#22c55e';
                    return (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="w-40 text-slate-400 truncate text-xs">{sector.name}</span>
                        <div className="flex-1 h-4 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: color }} />
                        </div>
                        <span className="w-16 text-right font-mono text-slate-300 text-xs">{time.toFixed(3)}s</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Engineer Feedback */}
              <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
                <h3 className="text-white font-bold mb-2">📻 Engineer Feedback</h3>
                <div className="space-y-2">
                  {result.feedback.map((msg, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-accent-amber mt-0.5">▸</span>
                      <span className="text-slate-300">{msg}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Setup Coach - Directional Hints */}
              {optimal && (() => {
                const { recommendations, paramHints } = getSetupRecommendations(setup, optimal.setup, result.totalTime, optimal.lapTime, track);
                const gap = round(result.totalTime - optimal.lapTime, 3);
                const dirIcon = (d: HintDirection) => {
                  switch (d) {
                    case 'up-big': return { icon: '⬆⬆', color: 'text-racing-red', label: 'Increase a lot' };
                    case 'up-small': return { icon: '⬆', color: 'text-accent-amber', label: 'Increase a bit' };
                    case 'good': return { icon: '✅', color: 'text-accent-green', label: 'Good' };
                    case 'down-small': return { icon: '⬇', color: 'text-accent-amber', label: 'Decrease a bit' };
                    case 'down-big': return { icon: '⬇⬇', color: 'text-racing-red', label: 'Decrease a lot' };
                  }
                };
                return (
                  <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-bold">🎯 Setup Coach</h3>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${gap <= 0.3 ? 'bg-accent-green/20 text-accent-green' : gap <= 1.0 ? 'bg-accent-amber/20 text-accent-amber' : gap <= 3.0 ? 'bg-orange-500/20 text-orange-400' : 'bg-racing-red/20 text-racing-red'}`}>
                        +{gap}s to optimal
                      </span>
                    </div>

                    {/* Visual performance meter — no exact times */}
                    <div className="bg-slate-900 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Your Setup</span>
                        <span>Optimal</span>
                      </div>
                      <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${gap <= 0.3 ? 'bg-accent-green' : gap <= 1.0 ? 'bg-accent-amber' : gap <= 3.0 ? 'bg-orange-400' : 'bg-racing-red'}`} style={{ width: `${Math.min(100, Math.max(20, (optimal.lapTime / result.totalTime) * 100))}%` }} />
                      </div>
                      <div className="text-center text-xs mt-1">
                        {gap <= 0.3 && <span className="text-accent-green">Race-winning setup! You nailed it!</span>}
                        {gap > 0.3 && gap <= 1.0 && <span className="text-accent-amber">Almost there — small tweaks needed</span>}
                        {gap > 1.0 && gap <= 3.0 && <span className="text-accent-amber">Room for improvement — follow the arrows below</span>}
                        {gap > 3.0 && <span className="text-racing-red">Big gap — focus on the red arrows first</span>}
                      </div>
                    </div>

                    {/* Engineer insights */}
                    <div className="space-y-2 mb-3">
                      {recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-accent-cyan mt-0.5 shrink-0">{i === 0 ? '📻' : '💡'}</span>
                          <span className="text-slate-300">{rec}</span>
                        </div>
                      ))}
                    </div>

                    {/* Directional hint dashboard */}
                    <div className="bg-slate-900 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Engineer's Notes</h4>
                        <button onClick={() => setShowTeachingTips(!showTeachingTips)} className="text-xs text-accent-cyan hover:text-white transition-colors">
                          {showTeachingTips ? 'Hide' : 'Show'} physics tips
                        </button>
                      </div>
                      <div className="space-y-1">
                        {paramHints.map((h, i) => {
                          const d = dirIcon(h.direction);
                          return (
                            <div key={i} className="group">
                              <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-800/50 transition-colors">
                                <span className={`text-lg w-8 text-center ${d.color}`}>{d.icon}</span>
                                <span className="text-sm text-white font-medium w-28">{h.param}</span>
                                <span className={`text-xs font-bold ${d.color} w-24`}>{d.label}</span>
                                <span className="text-xs text-slate-400 flex-1">{h.reason}</span>
                              </div>
                              {showTeachingTips && (
                                <div className="ml-10 mb-1 px-2 py-1.5 text-xs text-accent-cyan/80 bg-accent-cyan/5 rounded border-l-2 border-accent-cyan/30">
                                  {h.teachingTip}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 text-center">
                      Use the arrows to guide your adjustments — simulate again to see if you're getting closer!
                    </p>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="bg-racing-panel border border-racing-border rounded-xl p-12 text-center">
              <div className="text-4xl mb-4">🏎️</div>
              <h3 className="text-white font-bold mb-2">Ready to Simulate</h3>
              <p className="text-slate-400 text-sm mb-4">
                Adjust your car setup on the left, then hit <span className="text-racing-red font-bold">SIMULATE LAP</span> to see how it performs on {track.name}.
              </p>
              <p className="text-slate-500 text-xs">
                The physics are real — downforce, drag, tire grip, and weight all affect your lap time. Find the best trade-offs!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
