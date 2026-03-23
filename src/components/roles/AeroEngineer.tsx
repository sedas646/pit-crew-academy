import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { liftCoefficient, dragCoefficient, downforce, dragForce, aeroEfficiency, theoreticalTopSpeed, round, msToKph } from '../../utils/physics';
import { getChallengesByRole } from '../../data/challenges';
import { XP_REWARDS } from '../../utils/xp';
import SliderInput from '../shared/SliderInput';
import FormulaCard from '../shared/FormulaCard';
import Chart from '../shared/Chart';
import QuizModal from '../shared/QuizModal';
import XPPopup from '../shared/XPPopup';

export default function AeroEngineer() {
  const { state, dispatch } = useApp();
  const [wingAngle, setWingAngle] = useState(10);
  const [speed, setSpeed] = useState(200);
  const [showChallenge, setShowChallenge] = useState(false);
  const [xpPopup, setXpPopup] = useState<number | null>(null);

  const roleChallenges = getChallengesByRole('aero-engineer');
  const unsolvedChallenges = roleChallenges.filter(c => !state.completedChallenges.includes(c.id));
  const currentChallenge = unsolvedChallenges[0] || roleChallenges[0];

  const cl = liftCoefficient(wingAngle);
  const cd = dragCoefficient(wingAngle);
  const ld = aeroEfficiency(cl, cd);
  const speedMs = speed / 3.6;
  const df = downforce(speedMs, cl);
  const drag = dragForce(speedMs, cd);
  const topSpeed = round(msToKph(theoreticalTopSpeed(750000, cd)), 1);

  // Generate speed vs force chart data
  const chartData = useMemo(() => {
    const dfPoints: { x: number; y: number }[] = [];
    const dragPoints: { x: number; y: number }[] = [];
    for (let v = 50; v <= 350; v += 10) {
      const vMs = v / 3.6;
      dfPoints.push({ x: v, y: downforce(vMs, cl) });
      dragPoints.push({ x: v, y: dragForce(vMs, cd) });
    }
    return [
      { label: 'Downforce', color: '#22c55e', points: dfPoints },
      { label: 'Drag', color: '#ef4444', points: dragPoints },
    ];
  }, [cl, cd]);

  // Wing angle comparison chart
  const angleChart = useMemo(() => {
    const clPoints: { x: number; y: number }[] = [];
    const cdPoints: { x: number; y: number }[] = [];
    for (let a = 0; a <= 20; a += 1) {
      clPoints.push({ x: a, y: liftCoefficient(a) * 10 }); // scaled for visibility
      cdPoints.push({ x: a, y: dragCoefficient(a) * 10 });
    }
    return [
      { label: 'Cl × 10', color: '#22d3ee', points: clPoints },
      { label: 'Cd × 10', color: '#f59e0b', points: cdPoints },
    ];
  }, []);

  const handleChallengeAnswer = useCallback((correct: boolean) => {
    const xp = correct ? currentChallenge.xpReward : XP_REWARDS.CHALLENGE_ATTEMPT;
    dispatch({ type: 'ADD_XP', amount: xp });
    dispatch({ type: 'COMPLETE_CHALLENGE', challengeId: currentChallenge.id, correct, roleId: 'aero-engineer' });
    dispatch({ type: 'RUN_SIMULATION', roleId: 'aero-engineer' });
    if (ld > 4.0 && !state.badges.includes('aero-genius')) {
      dispatch({ type: 'EARN_BADGE', badgeId: 'aero-genius' });
    }
    setXpPopup(xp);
  }, [currentChallenge, dispatch, ld, state.badges]);

  return (
    <div className="p-6">
      {xpPopup && <XPPopup amount={xpPopup} onDone={() => setXpPopup(null)} />}
      {showChallenge && currentChallenge && (
        <QuizModal challenge={currentChallenge} onAnswer={handleChallengeAnswer} onClose={() => setShowChallenge(false)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-white">💨 Aero Engineer</h2>
          <p className="text-slate-400 text-sm">Design wing profiles and master downforce vs drag</p>
        </div>
        <button
          onClick={() => setShowChallenge(true)}
          className="px-4 py-2 bg-role-aero text-white rounded-lg font-semibold hover:bg-role-aero/80 transition-colors text-sm"
        >
          Aero Challenge ({unsolvedChallenges.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">Wing Profile</h3>
            <SliderInput label="Wing Angle" value={wingAngle} min={0} max={20} unit="°" color="#3b82f6" onChange={setWingAngle} hint="Higher = more downforce + drag" />
            <SliderInput label="Test Speed" value={speed} min={50} max={350} step={10} unit=" kph" color="#22d3ee" onChange={setSpeed} hint="Speed for calculations" />

            {/* Wing Visualization */}
            <div className="bg-slate-900 rounded-lg p-4 mt-3">
              <svg viewBox="0 0 200 100" className="w-full">
                {/* Airflow lines */}
                {[20, 35, 50, 65, 80].map(y => (
                  <path
                    key={y}
                    d={`M 10 ${y} Q 100 ${y + (y > 50 ? wingAngle * 0.8 : -wingAngle * 0.5)} 190 ${y}`}
                    fill="none"
                    stroke="#334155"
                    strokeWidth="0.5"
                    strokeDasharray="3 3"
                  />
                ))}
                {/* Wing profile */}
                <g transform={`translate(60, 50) rotate(${-wingAngle})`}>
                  <ellipse cx="40" cy="0" rx="40" ry={4 + wingAngle * 0.5} fill="#3b82f6" opacity="0.8" />
                  <ellipse cx="40" cy="-1" rx="38" ry={2 + wingAngle * 0.3} fill="#60a5fa" opacity="0.4" />
                </g>
                {/* Downforce arrow */}
                <line x1="100" y1="60" x2="100" y2={60 + Math.min(wingAngle * 2, 30)} stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowD)" />
                {/* Drag arrow */}
                <line x1="140" y1="50" x2={140 + Math.min(wingAngle * 1.5, 25)} y2="50" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowR)" />
                <defs>
                  <marker id="arrowD" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6" fill="#22c55e" />
                  </marker>
                  <marker id="arrowR" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6" fill="#ef4444" />
                  </marker>
                </defs>
                <text x="85" y={75 + Math.min(wingAngle * 2, 30)} fill="#22c55e" fontSize="8">Downforce</text>
                <text x={145 + Math.min(wingAngle * 1.5, 25)} y="53" fill="#ef4444" fontSize="8">Drag</text>
              </svg>
            </div>
          </div>

          {/* Results */}
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">Results @{speed} kph</h3>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-900 rounded-lg p-2">
                <div className="text-xs text-slate-500">Cl</div>
                <div className="text-lg font-mono font-bold text-accent-cyan">{round(cl, 3)}</div>
              </div>
              <div className="bg-slate-900 rounded-lg p-2">
                <div className="text-xs text-slate-500">Cd</div>
                <div className="text-lg font-mono font-bold text-accent-amber">{round(cd, 3)}</div>
              </div>
              <div className="bg-slate-900 rounded-lg p-2">
                <div className="text-xs text-slate-500">Downforce</div>
                <div className="text-lg font-mono font-bold text-accent-green">{round(df, 0)}N</div>
              </div>
              <div className="bg-slate-900 rounded-lg p-2">
                <div className="text-xs text-slate-500">Drag</div>
                <div className="text-lg font-mono font-bold text-racing-red">{round(drag, 0)}N</div>
              </div>
              <div className="bg-slate-900 rounded-lg p-2 col-span-2">
                <div className="text-xs text-slate-500">Aero Efficiency (L/D)</div>
                <div className={`text-xl font-mono font-bold ${ld > 4 ? 'text-accent-green' : ld > 2.5 ? 'text-accent-amber' : 'text-racing-red'}`}>
                  {round(ld, 2)} {ld > 4 ? '⭐' : ''}
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-2 col-span-2">
                <div className="text-xs text-slate-500">Theoretical Top Speed</div>
                <div className="text-xl font-mono font-bold text-white">{topSpeed} kph</div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts & Formulas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">Speed vs Force (at current wing angle)</h3>
            <p className="text-xs text-slate-500 mb-3">See how both downforce and drag grow with v² — but drag grows much faster at high angles!</p>
            <Chart
              datasets={chartData}
              height={280}
              xLabel="Speed (kph)"
              yLabel="Force (N)"
            />
          </div>

          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">Cl and Cd vs Wing Angle</h3>
            <p className="text-xs text-slate-500 mb-3">Cl grows linearly with angle, but Cd grows quadratically (v²). The red dot shows your current angle.</p>
            <Chart
              datasets={angleChart}
              height={220}
              xLabel="Wing Angle (degrees)"
              yLabel="Coefficient × 10"
              xMax={20}
            />
            {/* Current angle marker description */}
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-role-aero" />
              Current angle: {wingAngle}° — Cl = {round(cl, 3)}, Cd = {round(cd, 3)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormulaCard
              title="Downforce"
              formula="F = ½ × ρ × v² × Cl × A"
              description="Downforce pushes the car down, giving tires more grip. It grows with the square of speed — double the speed, 4x the downforce!"
              result={`${round(df, 0)}N at ${speed} kph`}
            />
            <FormulaCard
              title="Drag"
              formula="F = ½ × ρ × v² × Cd × A"
              description="Drag slows the car down. Same v² relationship. The key engineering challenge: maximize downforce while minimizing drag."
              result={`${round(drag, 0)}N at ${speed} kph`}
            />
          </div>

          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-2">💡 Key Insight</h3>
            <p className="text-slate-300 text-sm">
              The <span className="text-accent-cyan font-bold">L/D ratio</span> (lift-to-drag ratio) is the holy grail of aero engineering.
              {ld > 4 ? (
                <span className="text-accent-green"> Your current L/D of {round(ld, 2)} is excellent! This is F1-level efficiency.</span>
              ) : ld > 2.5 ? (
                <span className="text-accent-amber"> Your current L/D of {round(ld, 2)} is decent. Try to get above 4.0 for the Aero Genius badge!</span>
              ) : (
                <span className="text-racing-red"> Your current L/D of {round(ld, 2)} is low. Too much drag for the downforce you're getting. Try reducing the wing angle slightly.</span>
              )}
            </p>
            <p className="text-slate-500 text-xs mt-2">
              Real F1 teams spend millions in wind tunnels and CFD simulations to improve L/D by just 0.1!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
