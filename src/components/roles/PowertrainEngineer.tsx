import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { engineTorque, enginePower, kineticEnergy, round, kphToMs } from '../../utils/physics';
import { getChallengesByRole } from '../../data/challenges';
import { XP_REWARDS } from '../../utils/xp';
import Chart from '../shared/Chart';
import FormulaCard from '../shared/FormulaCard';
import SliderInput from '../shared/SliderInput';
import QuizModal from '../shared/QuizModal';
import XPPopup from '../shared/XPPopup';

export default function PowertrainEngineer() {
  const { state, dispatch } = useApp();
  const [rpm, setRpm] = useState(10500);
  const [ersMode, setErsMode] = useState(3);
  const [brakingFrom, setBrakingFrom] = useState(300);
  const [brakingTo, setBrakingTo] = useState(80);
  const [showChallenge, setShowChallenge] = useState(false);
  const [xpPopup, setXpPopup] = useState<number | null>(null);

  const roleChallenges = getChallengesByRole('powertrain-engineer');
  const unsolvedChallenges = roleChallenges.filter(c => !state.completedChallenges.includes(c.id));
  const currentChallenge = unsolvedChallenges[0] || roleChallenges[0];

  // Current calculations
  const torque = round(engineTorque(rpm), 1);
  const power = round(enginePower(rpm) / 1000, 1); // kW
  const ersBoost = ersMode * 24; // kW
  const totalPower = round(power + ersBoost, 1);

  // ERS energy from braking
  const carMass = 798;
  const ersHarvest = round(
    kineticEnergy(carMass, kphToMs(brakingFrom)) - kineticEnergy(carMass, kphToMs(brakingTo)),
    0
  );
  const ersHarvestKJ = round(ersHarvest / 1000, 1);
  const f1MaxHarvest = 2000; // kJ per lap in F1
  const harvestPercent = round((ersHarvestKJ / f1MaxHarvest) * 100, 1);

  // Power and torque curves
  const powerTorqueChart = useMemo(() => {
    const torquePoints: { x: number; y: number }[] = [];
    const powerPoints: { x: number; y: number }[] = [];
    for (let r = 4000; r <= 15000; r += 250) {
      torquePoints.push({ x: r, y: engineTorque(r) });
      powerPoints.push({ x: r, y: enginePower(r) / 1000 }); // kW
    }
    return [
      { label: 'Power (kW)', color: '#ef4444', points: powerPoints },
      { label: 'Torque (Nm)', color: '#22d3ee', points: torquePoints },
    ];
  }, []);

  // ERS energy flow visualization
  const ersChart = useMemo(() => {
    const deployPoints: { x: number; y: number }[] = [];
    const harvestPoints: { x: number; y: number }[] = [];
    // Simplified lap: alternate between harvest (braking) and deploy (accelerating)
    for (let i = 0; i < 20; i++) {
      const phase = i % 4;
      if (phase === 0) { // braking - harvest
        harvestPoints.push({ x: i * 5, y: 80 + Math.random() * 40 });
        deployPoints.push({ x: i * 5, y: 0 });
      } else if (phase === 1) { // corner
        harvestPoints.push({ x: i * 5, y: 20 });
        deployPoints.push({ x: i * 5, y: 10 });
      } else { // straight - deploy
        harvestPoints.push({ x: i * 5, y: 0 });
        deployPoints.push({ x: i * 5, y: ersMode * 24 });
      }
    }
    return [
      { label: 'Deploy (kW)', color: '#22c55e', points: deployPoints },
      { label: 'Harvest (kW)', color: '#f59e0b', points: harvestPoints },
    ];
  }, [ersMode]);

  const handleChallengeAnswer = useCallback((correct: boolean) => {
    const xp = correct ? currentChallenge.xpReward : XP_REWARDS.CHALLENGE_ATTEMPT;
    dispatch({ type: 'ADD_XP', amount: xp });
    dispatch({ type: 'COMPLETE_CHALLENGE', challengeId: currentChallenge.id, correct, roleId: 'powertrain-engineer' });
    dispatch({ type: 'RUN_SIMULATION', roleId: 'powertrain-engineer' });
    const ptCorrect = state.roleProgress['powertrain-engineer'].challengesCompleted + (correct ? 1 : 0);
    if (ptCorrect >= 5 && !state.badges.includes('full-power')) {
      dispatch({ type: 'EARN_BADGE', badgeId: 'full-power' });
    }
    setXpPopup(xp);
  }, [currentChallenge, dispatch, state]);

  return (
    <div className="p-6">
      {xpPopup && <XPPopup amount={xpPopup} onDone={() => setXpPopup(null)} />}
      {showChallenge && currentChallenge && (
        <QuizModal challenge={currentChallenge} onAnswer={handleChallengeAnswer} onClose={() => setShowChallenge(false)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-white">⚡ Powertrain Engineer</h2>
          <p className="text-slate-400 text-sm">Master engines, hybrid power, and energy recovery</p>
        </div>
        <button
          onClick={() => setShowChallenge(true)}
          className="px-4 py-2 bg-role-powertrain text-slate-900 rounded-lg font-semibold hover:bg-role-powertrain/80 transition-colors text-sm"
        >
          Power Challenge ({unsolvedChallenges.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-4">
          {/* Engine Controls */}
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">Engine</h3>
            <SliderInput label="RPM" value={rpm} min={4000} max={15000} step={500} color="#ef4444" onChange={setRpm} hint="Peak power ~12,500" />
            <SliderInput label="ERS Deploy Mode" value={ersMode} min={0} max={5} color="#22c55e" onChange={setErsMode} hint="0=off, 5=max 120kW" />

            <div className="grid grid-cols-2 gap-2 mt-3 text-center">
              <div className="bg-slate-900 rounded-lg p-2">
                <div className="text-xs text-slate-500">Torque</div>
                <div className="text-lg font-mono font-bold text-accent-cyan">{torque} Nm</div>
              </div>
              <div className="bg-slate-900 rounded-lg p-2">
                <div className="text-xs text-slate-500">ICE Power</div>
                <div className="text-lg font-mono font-bold text-racing-red">{power} kW</div>
              </div>
              <div className="bg-slate-900 rounded-lg p-2">
                <div className="text-xs text-slate-500">ERS Boost</div>
                <div className="text-lg font-mono font-bold text-accent-green">+{ersBoost} kW</div>
              </div>
              <div className="bg-slate-900 rounded-lg p-2">
                <div className="text-xs text-slate-500">TOTAL</div>
                <div className="text-lg font-mono font-bold text-white">{totalPower} kW</div>
                <div className="text-xs text-slate-500">{round(totalPower * 1.341, 0)} hp</div>
              </div>
            </div>
          </div>

          {/* ERS Harvesting */}
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">ERS Harvesting</h3>
            <p className="text-xs text-slate-500 mb-3">Calculate energy recovered from braking</p>
            <SliderInput label="Braking From" value={brakingFrom} min={100} max={350} step={10} unit=" kph" color="#ef4444" onChange={setBrakingFrom} />
            <SliderInput label="Braking To" value={brakingTo} min={50} max={200} step={10} unit=" kph" color="#3b82f6" onChange={setBrakingTo} />

            <div className="bg-slate-900 rounded-lg p-3 mt-2">
              <div className="text-center mb-2">
                <div className="text-xs text-slate-500">Energy Available</div>
                <div className="text-2xl font-mono font-bold text-accent-green">{ersHarvestKJ} kJ</div>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-green rounded-full transition-all"
                  style={{ width: `${Math.min(harvestPercent, 100)}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-1 text-center">
                {harvestPercent}% of F1 max harvest ({f1MaxHarvest} kJ/lap)
              </div>
            </div>
          </div>
        </div>

        {/* Charts & Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Power & Torque Curves */}
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-1">Power & Torque Curves</h3>
            <p className="text-xs text-slate-500 mb-3">
              Torque (cyan) peaks mid-range, then power (red) keeps climbing. Power = Torque × angular velocity.
              The red line is what determines your top speed and acceleration.
            </p>
            <Chart datasets={powerTorqueChart} height={280} xLabel="RPM" yLabel="kW / Nm" />
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <span className="w-3 h-1 bg-racing-red rounded" /> Power peaks at ~12,500 RPM
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-1 bg-accent-cyan rounded" /> Torque peaks at ~10,500 RPM
              </div>
            </div>
          </div>

          {/* ERS Flow */}
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-1">ERS Energy Flow (Simplified Lap)</h3>
            <p className="text-xs text-slate-500 mb-3">
              The MGU-K harvests energy under braking (amber) and deploys it on straights (green).
              F1 rules: max 120kW deploy, max 2MJ harvest per lap.
            </p>
            <Chart datasets={ersChart} height={200} xLabel="Lap Position (%)" yLabel="Power (kW)" />
          </div>

          {/* Formulas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormulaCard
              title="Power from Torque"
              formula="P = T × RPM × 2π / 60"
              description="Power is torque times rotational speed. That's why you need to rev the engine — more RPM means more power even if torque is the same."
              variables={[
                { symbol: 'T', meaning: 'Torque', value: `${torque} Nm` },
                { symbol: 'RPM', meaning: 'Revolutions/min', value: rpm.toString() },
              ]}
              result={`${power} kW (${round(power * 1.341, 0)} hp)`}
            />
            <FormulaCard
              title="Kinetic Energy (ERS)"
              formula="E = ½ × m × v²"
              description="The energy stored in a moving car. Under braking, some of this is captured by the MGU-K instead of being wasted as heat in the brakes."
              variables={[
                { symbol: 'm', meaning: 'Car mass', value: `${carMass} kg` },
                { symbol: 'v', meaning: 'Speed', value: `${brakingFrom} kph` },
              ]}
              result={`${ersHarvestKJ} kJ recoverable`}
            />
          </div>

          {/* Fun Facts */}
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-2">⚡ Power Unit Facts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-400">
              <div className="flex gap-2">
                <span className="text-accent-green">▸</span>
                <span>F1 engines are the most thermally efficient ICEs ever built (~50% vs ~30% for road cars)</span>
              </div>
              <div className="flex gap-2">
                <span className="text-accent-green">▸</span>
                <span>The MGU-H recovers energy from exhaust gases — unique to F1</span>
              </div>
              <div className="flex gap-2">
                <span className="text-accent-green">▸</span>
                <span>Total power: ~1000hp from a 1.6L V6 turbo hybrid (a road car V6 makes ~300hp)</span>
              </div>
              <div className="flex gap-2">
                <span className="text-accent-green">▸</span>
                <span>F1 engines rev to 15,000 RPM (road cars: ~6,000-8,000 RPM)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
