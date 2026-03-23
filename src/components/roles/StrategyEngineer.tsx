import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { tireDegradation, pitStopLoss, fuelEffect, round } from '../../utils/physics';
import { getChallengesByRole } from '../../data/challenges';
import { XP_REWARDS } from '../../utils/xp';
import Chart from '../shared/Chart';
import FormulaCard from '../shared/FormulaCard';
import QuizModal from '../shared/QuizModal';
import XPPopup from '../shared/XPPopup';

type Compound = 'soft' | 'medium' | 'hard';

interface PitStop {
  lap: number;
  compound: Compound;
}

const COMPOUND_COLORS: Record<Compound, string> = { soft: '#ef4444', medium: '#f59e0b', hard: '#94a3b8' };
const COMPOUND_PACE: Record<Compound, number> = { soft: -1.2, medium: 0, hard: 0.6 };
const BASE_LAP_TIME = 88;

export default function StrategyEngineer() {
  const { state, dispatch } = useApp();
  const [totalLaps, setTotalLaps] = useState(52);
  const [startCompound, setStartCompound] = useState<Compound>('soft');
  const [pitStops, setPitStops] = useState<PitStop[]>([{ lap: 20, compound: 'medium' }]);
  const [showResult, setShowResult] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [xpPopup, setXpPopup] = useState<number | null>(null);

  const roleChallenges = getChallengesByRole('strategy-engineer');
  const unsolvedChallenges = roleChallenges.filter(c => !state.completedChallenges.includes(c.id));
  const currentChallenge = unsolvedChallenges[0] || roleChallenges[0];

  // Calculate strategy
  const strategyResult = useMemo(() => {
    const lapTimes: { lap: number; time: number; compound: Compound }[] = [];
    let currentCompound = startCompound;
    let stintStart = 0;
    const stops = [...pitStops].sort((a, b) => a.lap - b.lap);
    let totalTime = 0;
    let pitTimeTotal = 0;

    for (let lap = 0; lap < totalLaps; lap++) {
      // Check for pit stop
      const stop = stops.find(s => s.lap === lap + 1);
      if (stop) {
        currentCompound = stop.compound;
        stintStart = lap;
        pitTimeTotal += pitStopLoss();
      }

      const stintLap = lap - stintStart;
      const deg = tireDegradation(stintLap, currentCompound);
      const fuelDelta = fuelEffect(110 - (110 / totalLaps) * lap);
      const lapTime = BASE_LAP_TIME + COMPOUND_PACE[currentCompound] + deg + fuelDelta;

      lapTimes.push({ lap: lap + 1, time: round(lapTime, 3), compound: currentCompound });
      totalTime += lapTime;
    }

    totalTime += pitTimeTotal;

    return {
      lapTimes,
      totalTime: round(totalTime, 1),
      pitTimeTotal: round(pitTimeTotal, 1),
      numStops: stops.length,
    };
  }, [totalLaps, startCompound, pitStops]);

  // Compare with 1-stop strategy
  const oneStopTime = useMemo(() => {
    let total = 0;
    for (let lap = 0; lap < totalLaps; lap++) {
      const compound: Compound = lap < Math.floor(totalLaps * 0.55) ? 'medium' : 'hard';
      const stintLap = lap < Math.floor(totalLaps * 0.55) ? lap : lap - Math.floor(totalLaps * 0.55);
      const deg = tireDegradation(stintLap, compound);
      const fuelDelta = fuelEffect(110 - (110 / totalLaps) * lap);
      total += BASE_LAP_TIME + COMPOUND_PACE[compound] + deg + fuelDelta;
    }
    return round(total + pitStopLoss(), 1);
  }, [totalLaps]);

  const chartData = useMemo(() => {
    const data: Record<Compound, { x: number; y: number }[]> = { soft: [], medium: [], hard: [] };
    strategyResult.lapTimes.forEach(lt => {
      data[lt.compound].push({ x: lt.lap, y: lt.time });
    });
    return Object.entries(data)
      .filter(([, points]) => points.length > 0)
      .map(([compound, points]) => ({
        label: compound.charAt(0).toUpperCase() + compound.slice(1),
        color: COMPOUND_COLORS[compound as Compound],
        points,
      }));
  }, [strategyResult]);

  // Degradation comparison chart
  const degChart = useMemo(() => {
    const compounds: Compound[] = ['soft', 'medium', 'hard'];
    return compounds.map(c => ({
      label: c.charAt(0).toUpperCase() + c.slice(1),
      color: COMPOUND_COLORS[c],
      points: Array.from({ length: 30 }, (_, i) => ({ x: i, y: tireDegradation(i, c) })),
    }));
  }, []);

  function addPitStop() {
    const lastStop = pitStops.length > 0 ? pitStops[pitStops.length - 1].lap : 0;
    setPitStops([...pitStops, { lap: Math.min(lastStop + 15, totalLaps - 5), compound: 'hard' }]);
  }

  function removePitStop(index: number) {
    setPitStops(pitStops.filter((_, i) => i !== index));
  }

  function updatePitStop(index: number, field: 'lap' | 'compound', value: number | Compound) {
    const updated = [...pitStops];
    updated[index] = { ...updated[index], [field]: value };
    setPitStops(updated);
  }

  function handleSimulate() {
    setShowResult(true);
    dispatch({ type: 'RUN_SIMULATION', roleId: 'strategy-engineer' });
    dispatch({ type: 'ADD_XP', amount: XP_REWARDS.SIMULATION_RUN });
    setXpPopup(XP_REWARDS.SIMULATION_RUN);
  }

  const handleChallengeAnswer = useCallback((correct: boolean) => {
    const xp = correct ? currentChallenge.xpReward : XP_REWARDS.CHALLENGE_ATTEMPT;
    dispatch({ type: 'ADD_XP', amount: xp });
    dispatch({ type: 'COMPLETE_CHALLENGE', challengeId: currentChallenge.id, correct, roleId: 'strategy-engineer' });
    const stratCorrect = state.roleProgress['strategy-engineer'].challengesCompleted + (correct ? 1 : 0);
    if (stratCorrect >= 5 && !state.badges.includes('strategy-master')) {
      dispatch({ type: 'EARN_BADGE', badgeId: 'strategy-master' });
    }
    setXpPopup(xp);
  }, [currentChallenge, dispatch, state]);

  const timeDiff = round(strategyResult.totalTime - oneStopTime, 1);

  return (
    <div className="p-6">
      {xpPopup && <XPPopup amount={xpPopup} onDone={() => setXpPopup(null)} />}
      {showChallenge && currentChallenge && (
        <QuizModal challenge={currentChallenge} onAnswer={handleChallengeAnswer} onClose={() => setShowChallenge(false)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-white">🧠 Strategy Engineer</h2>
          <p className="text-slate-400 text-sm">Plan pit stops and optimize race strategy</p>
        </div>
        <button
          onClick={() => setShowChallenge(true)}
          className="px-4 py-2 bg-role-strategy text-slate-900 rounded-lg font-semibold hover:bg-role-strategy/80 transition-colors text-sm"
        >
          Strategy Challenge ({unsolvedChallenges.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strategy Builder */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">Race Setup</h3>
            <div className="mb-3">
              <label className="text-sm text-slate-300 block mb-1">Race Length</label>
              <input
                type="number"
                value={totalLaps}
                onChange={e => setTotalLaps(Math.max(10, Math.min(78, Number(e.target.value))))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-role-strategy"
              />
            </div>
            <div className="mb-3">
              <label className="text-sm text-slate-300 block mb-1">Starting Tire</label>
              <div className="flex gap-2">
                {(['soft', 'medium', 'hard'] as Compound[]).map(c => (
                  <button
                    key={c}
                    onClick={() => setStartCompound(c)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                      startCompound === c ? 'ring-2 ring-white' : 'opacity-60'
                    }`}
                    style={{ backgroundColor: COMPOUND_COLORS[c], color: c === 'hard' ? '#000' : '#fff' }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold">Pit Stops ({pitStops.length})</h3>
              <button onClick={addPitStop} className="text-xs bg-slate-700 text-white px-2 py-1 rounded hover:bg-slate-600">+ Add Stop</button>
            </div>
            {pitStops.map((stop, i) => (
              <div key={i} className="bg-slate-900 rounded-lg p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">Stop {i + 1}</span>
                  <button onClick={() => removePitStop(i)} className="text-xs text-racing-red hover:text-racing-red/80">Remove</button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500">Lap</label>
                    <input
                      type="number"
                      value={stop.lap}
                      onChange={e => updatePitStop(i, 'lap', Number(e.target.value))}
                      min={1}
                      max={totalLaps}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500">Compound</label>
                    <select
                      value={stop.compound}
                      onChange={e => updatePitStop(i, 'compound', e.target.value as Compound)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm outline-none"
                    >
                      <option value="soft">Soft</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <div className="text-xs text-slate-500 mt-2">
              Pit stop time loss: {round(pitStopLoss(), 1)}s per stop
            </div>
          </div>

          <button
            onClick={handleSimulate}
            className="w-full py-3 bg-role-strategy text-slate-900 rounded-xl font-black text-sm hover:bg-role-strategy/90 transition-colors"
          >
            📊 SIMULATE RACE
          </button>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Degradation Chart */}
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-1">Tire Degradation Curves</h3>
            <p className="text-xs text-slate-500 mb-3">How quickly each compound loses performance. Soft is fast but degrades quickly.</p>
            <Chart datasets={degChart} height={200} xLabel="Stint Lap" yLabel="Time Loss (s)" />
          </div>

          {/* Lap Time Progression */}
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-1">Lap Time Progression</h3>
            <p className="text-xs text-slate-500 mb-3">Your strategy's lap-by-lap pace. Spikes show pit stops. Colors show tire compound.</p>
            <Chart datasets={chartData} height={250} xLabel="Lap" yLabel="Lap Time (s)" xMax={totalLaps} />
          </div>

          {showResult && (
            <>
              {/* Race Summary */}
              <div className="bg-racing-panel border border-racing-border rounded-xl p-4 slide-in">
                <h3 className="text-white font-bold mb-3">Race Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mb-4">
                  <div className="bg-slate-900 rounded-lg p-3">
                    <div className="text-xs text-slate-500">Total Race Time</div>
                    <div className="text-xl font-mono font-bold text-white">{Math.floor(strategyResult.totalTime / 60)}:{(strategyResult.totalTime % 60).toFixed(1).padStart(4, '0')}</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3">
                    <div className="text-xs text-slate-500">Pit Stops</div>
                    <div className="text-xl font-mono font-bold text-role-strategy">{strategyResult.numStops}</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3">
                    <div className="text-xs text-slate-500">Time in Pits</div>
                    <div className="text-xl font-mono font-bold text-racing-red">{strategyResult.pitTimeTotal}s</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3">
                    <div className="text-xs text-slate-500">vs 1-Stop (Med→Hard)</div>
                    <div className={`text-xl font-mono font-bold ${timeDiff < 0 ? 'text-accent-green' : 'text-racing-red'}`}>
                      {timeDiff > 0 ? '+' : ''}{timeDiff}s
                    </div>
                  </div>
                </div>

                {/* Strategy visual */}
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-2">Strategy Overview</div>
                  <div className="flex h-6 rounded-full overflow-hidden">
                    {(() => {
                      const segments: { compound: Compound; start: number; end: number }[] = [];
                      let currentComp = startCompound;
                      let segStart = 0;
                      const sortedStops = [...pitStops].sort((a, b) => a.lap - b.lap);
                      for (const stop of sortedStops) {
                        segments.push({ compound: currentComp, start: segStart, end: stop.lap });
                        currentComp = stop.compound;
                        segStart = stop.lap;
                      }
                      segments.push({ compound: currentComp, start: segStart, end: totalLaps });
                      return segments.map((seg, i) => (
                        <div
                          key={i}
                          className="h-full flex items-center justify-center text-xs font-bold"
                          style={{
                            width: `${((seg.end - seg.start) / totalLaps) * 100}%`,
                            backgroundColor: COMPOUND_COLORS[seg.compound],
                            color: seg.compound === 'hard' ? '#000' : '#fff',
                          }}
                        >
                          {seg.compound.charAt(0).toUpperCase()} L{seg.start + 1}-{seg.end}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              <FormulaCard
                title="Tire Degradation"
                formula="Δt = base_deg × lap^1.3"
                description="Tire degradation is non-linear — it gets exponentially worse the longer you stay out. This is why timing your pit stop perfectly matters so much."
                variables={[
                  { symbol: 'base_deg', meaning: 'Compound rate', value: 'S:0.08, M:0.04, H:0.025' },
                  { symbol: 'lap', meaning: 'Laps on current tire' },
                ]}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
