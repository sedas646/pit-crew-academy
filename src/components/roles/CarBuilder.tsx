import { useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { XP_REWARDS } from '../../utils/xp';
import FormulaCard from '../shared/FormulaCard';
import XPPopup from '../shared/XPPopup';

interface CarComponent {
  id: string;
  name: string;
  category: 'chassis' | 'aero' | 'powertrain' | 'suspension' | 'electronics' | 'safety';
  icon: string;
  description: string;
  deepDive: string;
  funFact: string;
  formula?: { title: string; formula: string; description: string };
  position: { x: number; y: number }; // position on the car diagram
  installed: boolean;
}

const initialComponents: CarComponent[] = [
  // CHASSIS
  {
    id: 'monocoque', name: 'Monocoque (Survival Cell)', category: 'chassis', icon: '🛡️',
    description: 'The main structure of the car. Made from carbon fibre, it\'s the "tub" the driver sits in. Everything else bolts onto it.',
    deepDive: 'The monocoque must pass incredibly strict FIA crash tests. It can withstand a 15G frontal impact. Carbon fibre is 5x stronger than steel but 5x lighter. The monocoque weighs only about 35kg but protects the driver from impacts at over 300 kph. It\'s essentially a carbon fibre shell just 3-4mm thick, built up from hundreds of layers of pre-impregnated carbon cloth baked in an autoclave at 130°C.',
    funFact: 'An F1 monocoque takes about 10 weeks to build and costs around £500,000',
    position: { x: 40, y: 45 }, installed: false,
  },
  {
    id: 'floor', name: 'Floor & Diffuser', category: 'chassis', icon: '⬛',
    description: 'The flat bottom of the car that generates massive downforce using ground effect. The diffuser at the rear expands the airflow.',
    deepDive: 'Ground effect is the biggest source of downforce in modern F1 (since 2022 regulations). The shaped floor creates a venturi tunnel — air speeds up as it passes through the narrow gap between the floor and track surface. Faster air = lower pressure (Bernoulli\'s principle). This pressure difference sucks the car onto the track. The diffuser at the rear slows the air back down, recovering pressure gradually to prevent turbulence.',
    funFact: 'The floor generates about 50% of all downforce — more than both wings combined',
    formula: { title: 'Bernoulli\'s Principle', formula: 'P₁ + ½ρv₁² = P₂ + ½ρv₂²', description: 'Faster airflow = lower pressure. This is how the floor sucks the car onto the track.' },
    position: { x: 50, y: 70 }, installed: false,
  },
  // AERO
  {
    id: 'front-wing', name: 'Front Wing', category: 'aero', icon: '🔽',
    description: 'The first part of the car to hit the air. It generates downforce at the front and directs airflow around the car.',
    deepDive: 'The front wing is arguably the most important aerodynamic device on the car. It does three jobs: (1) generates front downforce for turn-in grip, (2) conditions and directs airflow to the rest of the car, and (3) creates vortices that manage the turbulent wake from the front tires. The endplates aren\'t just walls — they\'re carefully shaped to create swirling vortices that seal the floor edge from "dirty" air. Engineers can adjust the wing angle by fractions of a degree between sessions.',
    funFact: 'A front wing costs about £150,000 and a team might use 10+ per season (crashes!)',
    formula: { title: 'Downforce', formula: 'F = ½ × ρ × v² × Cl × A', description: 'The front wing generates about 30% of total car downforce' },
    position: { x: 8, y: 50 }, installed: false,
  },
  {
    id: 'rear-wing', name: 'Rear Wing + DRS', category: 'aero', icon: '📐',
    description: 'Creates rear downforce for traction. DRS (Drag Reduction System) opens the flap on straights to reduce drag.',
    deepDive: 'The rear wing generates massive downforce but also creates the most drag. That\'s why DRS exists — the upper element opens 50mm, reducing drag by about 20% and adding 10-15 kph of top speed. The rear wing also determines aero balance — too much rear downforce and the car understeers (pushes wide), too little and it oversteers (the rear slides). Teams bring different rear wing specs to different tracks: low-downforce "spoon" wings for Monza, high-downforce wings for Monaco.',
    funFact: 'DRS activation zones are decided by the FIA — drivers can only use it when within 1 second of the car ahead',
    position: { x: 85, y: 30 }, installed: false,
  },
  {
    id: 'sidepods', name: 'Sidepods', category: 'aero', icon: '🌊',
    description: 'House the radiators for cooling and are shaped to manage airflow to the rear of the car.',
    deepDive: 'Sidepods are a massive design challenge. They must contain radiators large enough to cool a 1000hp engine (rejecting about 150kW of heat), but they also need to be as small and aerodynamically clean as possible. The air enters through the sidepod inlet, passes through the radiators, and exits through the bodywork. Modern designs use very aggressive downwash concepts to channel air around and over the sidepods toward the floor and diffuser. Teams like Red Bull and Mercedes have taken radically different approaches.',
    funFact: 'Mercedes\' 2022 "zero sidepod" design was one of the most radical in F1 history',
    position: { x: 45, y: 35 }, installed: false,
  },
  // POWERTRAIN
  {
    id: 'engine', name: 'Power Unit (ICE)', category: 'powertrain', icon: '🔥',
    description: '1.6 litre V6 turbo hybrid engine. Produces about 750kW from one of the most advanced engines ever built.',
    deepDive: 'The Internal Combustion Engine (ICE) is a 1.6L turbocharged V6 running at up to 15,000 RPM. Despite its small size, it produces about 550hp on its own. What makes it extraordinary is its thermal efficiency — about 50% of the fuel\'s energy becomes useful work (vs ~30% for a road car). The engine runs incredibly lean and uses pre-chamber ignition (a tiny "jet" of flame ignites the main charge). Each engine must last several race weekends — about 3,000 km at maximum stress.',
    funFact: 'An F1 engine costs about £10 million to develop and £500,000 to build each unit',
    formula: { title: 'Power', formula: 'P = T × RPM × 2π / 60', description: 'Power is torque times rotational speed. Peak power at ~12,500 RPM.' },
    position: { x: 55, y: 45 }, installed: false,
  },
  {
    id: 'mgu-k', name: 'MGU-K (Kinetic)', category: 'powertrain', icon: '⚡',
    description: 'Motor Generator Unit - Kinetic. Harvests energy from braking and deploys 120kW of extra power.',
    deepDive: 'The MGU-K is connected to the crankshaft. Under braking, it acts as a generator — converting kinetic energy into electrical energy stored in the battery (Energy Store). On acceleration, it flips to motor mode and adds up to 120kW (161hp) of power. It can harvest up to 2MJ of energy per lap. That\'s like lifting a 200kg weight up 1,000 metres! The 120kW deployment limit is regulated — without it, teams would use even more electric power.',
    funFact: 'The MGU-K can switch between harvest and deploy mode in milliseconds',
    formula: { title: 'Kinetic Energy', formula: 'E = ½ × m × v²', description: 'Energy recovered from braking — the faster you were going, the more energy available' },
    position: { x: 60, y: 55 }, installed: false,
  },
  {
    id: 'mgu-h', name: 'MGU-H (Heat)', category: 'powertrain', icon: '🌡️',
    description: 'Motor Generator Unit - Heat. Recovers waste energy from the turbocharger exhaust gases.',
    deepDive: 'The MGU-H is connected to the turbocharger shaft. It harvests energy from the hot exhaust gases that spin the turbine. Uniquely, it has NO regulated limit on harvest or deployment. It serves two purposes: (1) it generates electricity from waste exhaust energy, and (2) it can spin the turbo compressor electrically, eliminating "turbo lag" (the delay before a turbo spools up). This is why F1 cars have instant throttle response despite using turbos.',
    funFact: 'The MGU-H is so complex it\'s being dropped from 2026 F1 regulations — too expensive',
    position: { x: 65, y: 40 }, installed: false,
  },
  {
    id: 'battery', name: 'Energy Store (Battery)', category: 'powertrain', icon: '🔋',
    description: 'Lithium-ion battery storing energy from both MGU-K and MGU-H. Must weigh between 20-25kg.',
    deepDive: 'The Energy Store is a high-power lithium-ion battery pack. It\'s designed for power density (fast charge/discharge) rather than energy density (total storage). It can deliver up to 120kW and stores about 4MJ of usable energy. Operating temperature is critical — too cold and it can\'t deliver power, too hot and cells degrade or become dangerous. A sophisticated liquid cooling system keeps it in a narrow temperature window. The battery management system monitors every individual cell.',
    funFact: 'The battery weighs only 20-25kg but handles power levels equivalent to 160 horsepower',
    position: { x: 50, y: 60 }, installed: false,
  },
  {
    id: 'gearbox', name: 'Gearbox', category: 'powertrain', icon: '⚙️',
    description: '8-speed seamless shift gearbox. Gear changes happen in under 10 milliseconds.',
    deepDive: 'F1 gearboxes use a "seamless shift" design — the next gear is pre-selected and engaged before the current gear releases, so there\'s never a moment without drive torque. Gear changes take less than 10 milliseconds (a blink is 150ms). The gearbox also acts as a structural element — the rear suspension mounts to it, and the engine mounts to the front. Made from titanium and carbon fibre, it weighs about 40kg and must last 6 race weekends.',
    funFact: 'Drivers shift gear about 3,000 times during a single race — all via paddle shifters',
    position: { x: 70, y: 50 }, installed: false,
  },
  // SUSPENSION
  {
    id: 'front-suspension', name: 'Front Suspension', category: 'suspension', icon: '🔧',
    description: 'Double wishbone pushrod suspension. Controls how the front of the car moves over bumps and in corners.',
    deepDive: 'F1 uses double wishbone suspension with pushrod or pullrod actuated spring/damper units. The geometry is critical — it controls camber (tire angle) through the suspension travel, which affects grip. The spring rate, damper settings, and anti-roll bar stiffness all affect how weight transfers during cornering, braking, and acceleration. Engineers adjust these settings between sessions using data from ride height sensors, accelerometers, and tire temperature sensors.',
    funFact: 'Suspension components are made from titanium and carbon fibre — one wishbone weighs less than 1kg',
    formula: { title: 'Natural Frequency', formula: 'f = (1/2π) × √(k/m)', description: 'Spring rate (k) and mass (m) determine how quickly the suspension oscillates' },
    position: { x: 20, y: 45 }, installed: false,
  },
  {
    id: 'rear-suspension', name: 'Rear Suspension', category: 'suspension', icon: '🔩',
    description: 'Rear suspension handles traction and stability. Usually pullrod design for better aero packaging.',
    deepDive: 'The rear suspension is even more complex than the front because it also handles the drive forces from the engine. The geometry must manage both lateral grip (cornering) and longitudinal grip (acceleration out of corners). Rear suspension often uses a pullrod layout (spring/damper below the gearbox) for better aerodynamic packaging — keeping the top of the car clean for airflow. The rear anti-roll bar is key for controlling oversteer.',
    funFact: 'The rear suspension connects to the gearbox casing, not the monocoque',
    position: { x: 75, y: 50 }, installed: false,
  },
  {
    id: 'tires', name: 'Tires (Pirelli)', category: 'suspension', icon: '⭕',
    description: 'The only contact between car and track. 5 compounds available from ultra-soft to hard.',
    deepDive: 'Each tire has a contact patch of only about 150cm² (about the size of a postcard) — yet it transmits all the forces that accelerate, brake, and turn the car. Tires operate in a narrow temperature window: too cold = no grip, too hot = blistering and degradation. Soft compounds have more grip but wear faster. Hard compounds last longer but are slower. The rubber compound, construction (belts, carcass), and operating window are all critical. Tire warmers heat the tires to ~70°C before they go on the car.',
    funFact: 'F1 tires cost about £2,000 per set — a team uses about 13 sets per race weekend',
    position: { x: 15, y: 65 }, installed: false,
  },
  // ELECTRONICS
  {
    id: 'steering-wheel', name: 'Steering Wheel', category: 'electronics', icon: '🎮',
    description: 'Far more than just steering — it\'s the driver\'s control panel with 20+ buttons, rotary dials, and a display.',
    deepDive: 'An F1 steering wheel has: gear shift paddles, clutch paddles, DRS button, ERS mode dial, brake balance adjuster, differential adjust, engine mode button, pit lane speed limiter, radio button, drink button, and more. The integrated display shows lap times, tire temps, fuel usage, and sector information. The driver changes settings hundreds of times per lap — adjusting brake balance into different corners, managing ERS deployment, and communicating with the pit wall. It costs about £40,000.',
    funFact: 'Each steering wheel is custom-made to fit the individual driver\'s hands',
    position: { x: 30, y: 40 }, installed: false,
  },
  {
    id: 'ecu', name: 'ECU (Standard)', category: 'electronics', icon: '💻',
    description: 'The car\'s brain — a standard McLaren Applied unit used by all teams. Processes 300+ sensor inputs.',
    deepDive: 'The Electronic Control Unit runs the engine, ERS, gearbox, and safety systems. All teams use the same standard ECU (McLaren Applied TAG-400) to ensure fairness and prevent expensive control electronics wars. It processes data from 300+ sensors at up to 1,000 times per second. Sensors measure everything: wheel speed, yaw rate, brake temperatures, oil pressure, exhaust temps, ride height, and more. This data is transmitted live to the pit wall at 1.5TB per race weekend.',
    funFact: 'Teams generate about 1.5 terabytes of data per race weekend — that\'s 300 feature films',
    position: { x: 40, y: 55 }, installed: false,
  },
  // SAFETY
  {
    id: 'halo', name: 'Halo', category: 'safety', icon: '🛡️',
    description: 'Titanium head protection device. Can withstand the weight of a London double-decker bus.',
    deepDive: 'The Halo is a titanium structure weighing about 9kg that sits above the cockpit opening. It\'s made from Grade 5 titanium (Ti-6Al-4V, the same alloy used in aerospace). It must withstand a static load of 125kN — equivalent to 12.7 tonnes pressing down on it (about the weight of 2 adult elephants or a London bus). It was controversial when introduced in 2018 but has since been credited with saving multiple lives, including Romain Grosjean\'s horrific crash at Bahrain 2020 where his car split in half and caught fire.',
    funFact: 'The Halo saved Romain Grosjean\'s life in 2020 when his car went through a barrier at 221 kph',
    position: { x: 32, y: 32 }, installed: false,
  },
  {
    id: 'fire-system', name: 'Fire Suppression', category: 'safety', icon: '🧯',
    description: 'Onboard fire extinguisher that can be triggered by the driver or marshals. Uses FIA-approved suppressant.',
    deepDive: 'The fire suppression system uses a pressurised canister of chemical suppressant that can be activated by the driver (button on steering wheel) or externally by marshals (pull ring on the bodywork). The system has nozzles positioned in the cockpit and around the engine/fuel cell. Modern F1 fuel cells (Kevlar-reinforced rubber bladders) are designed to be puncture-resistant and self-sealing, but the fire system is the backup. Every car also carries a 6-point harness, HANS device (head restraint), and fire-resistant clothing rated to withstand 840°C for 11 seconds.',
    funFact: 'F1 race suits can withstand 840°C flames for 11 seconds — enough time to escape the car',
    position: { x: 48, y: 50 }, installed: false,
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All', color: '#8b5cf6' },
  { id: 'chassis', label: 'Chassis', color: '#94a3b8' },
  { id: 'aero', label: 'Aerodynamics', color: '#3b82f6' },
  { id: 'powertrain', label: 'Powertrain', color: '#22c55e' },
  { id: 'suspension', label: 'Suspension & Tires', color: '#f59e0b' },
  { id: 'electronics', label: 'Electronics', color: '#22d3ee' },
  { id: 'safety', label: 'Safety', color: '#ef4444' },
];

export default function CarBuilder() {
  const { dispatch } = useApp();
  const [components, setComponents] = useState<CarComponent[]>(initialComponents);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [xpPopup, setXpPopup] = useState<number | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [quizComponent, setQuizComponent] = useState<CarComponent | null>(null);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizResult, setQuizResult] = useState<boolean | null>(null);

  const selected = components.find(c => c.id === selectedId);
  const installedCount = components.filter(c => c.installed).length;
  const totalCount = components.length;
  const progress = Math.round((installedCount / totalCount) * 100);

  const filtered = filter === 'all' ? components : components.filter(c => c.category === filter);

  const installComponent = useCallback((id: string) => {
    setComponents(prev => prev.map(c => c.id === id ? { ...c, installed: true } : c));
    dispatch({ type: 'LEARN_CONCEPT', roleId: 'race-engineer', conceptId: `car-part-${id}` });
    dispatch({ type: 'ADD_XP', amount: XP_REWARDS.CONCEPT_LEARNED });
    setXpPopup(XP_REWARDS.CONCEPT_LEARNED);
  }, [dispatch]);

  const startQuiz = useCallback(() => {
    const uninstalled = components.filter(c => !c.installed);
    if (uninstalled.length === 0) return;
    const random = uninstalled[Math.floor(Math.random() * uninstalled.length)];
    setQuizComponent(random);
    setQuizAnswer('');
    setQuizResult(null);
    setQuizMode(true);
  }, [components]);

  const checkQuiz = useCallback(() => {
    if (!quizComponent) return;
    const correct = quizAnswer.toLowerCase().includes(quizComponent.name.toLowerCase().split(' ')[0].toLowerCase()) ||
                    quizAnswer.toLowerCase().includes(quizComponent.name.toLowerCase().split('(')[0].trim().toLowerCase());
    setQuizResult(correct);
    if (correct) {
      installComponent(quizComponent.id);
    }
  }, [quizComponent, quizAnswer, installComponent]);

  return (
    <div className="p-6">
      {xpPopup && <XPPopup amount={xpPopup} onDone={() => setXpPopup(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-white">🔧 Car Builder</h2>
          <p className="text-slate-400 text-sm">Learn every component of a Formula 1 car by building one piece by piece</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">Assembly Progress</div>
          <div className="text-2xl font-black text-white">{installedCount}/{totalCount}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-racing-panel border border-racing-border rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-300">Car Assembly: {progress}%</span>
          <button
            onClick={startQuiz}
            disabled={installedCount === totalCount}
            className="px-3 py-1.5 bg-xp-bar text-white rounded-lg text-sm font-semibold hover:bg-xp-bar/80 disabled:opacity-40 transition-colors"
          >
            🧩 Quick Quiz - Name That Part!
          </button>
        </div>
        <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-racing-red via-accent-amber to-accent-green rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        {installedCount === totalCount && (
          <div className="text-center mt-3 text-accent-green font-bold text-sm">
            🏆 Car fully assembled! You know every component of an F1 car!
          </div>
        )}
      </div>

      {/* Quiz Modal */}
      {quizMode && quizComponent && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-racing-panel border border-racing-border rounded-xl max-w-md w-full p-6 slide-in">
            <h3 className="text-lg font-bold text-white mb-3">🧩 Name That Part!</h3>
            <p className="text-slate-300 text-sm mb-4">{quizComponent.description}</p>
            <p className="text-xs text-slate-500 mb-2">Category: <span className="text-accent-cyan">{quizComponent.category}</span></p>
            {quizResult === null ? (
              <>
                <input
                  type="text"
                  value={quizAnswer}
                  onChange={e => setQuizAnswer(e.target.value)}
                  placeholder="What component is this?"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white mb-4 outline-none focus:border-xp-bar"
                  onKeyDown={e => e.key === 'Enter' && quizAnswer && checkQuiz()}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => setQuizMode(false)} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm">Skip</button>
                  <button onClick={checkQuiz} disabled={!quizAnswer} className="flex-1 px-4 py-2 bg-xp-bar text-white rounded-lg font-semibold text-sm disabled:opacity-40">Submit</button>
                </div>
              </>
            ) : (
              <>
                <div className={`rounded-lg p-3 mb-4 ${quizResult ? 'bg-accent-green/10 border border-accent-green/30' : 'bg-racing-red/10 border border-racing-red/30'}`}>
                  <span className={`font-bold ${quizResult ? 'text-accent-green' : 'text-racing-red'}`}>
                    {quizResult ? '✅ Correct!' : `❌ It was: ${quizComponent.name}`}
                  </span>
                </div>
                <button onClick={() => setQuizMode(false)} className="w-full px-4 py-2 bg-xp-bar text-white rounded-lg font-semibold text-sm">
                  {quizResult ? 'Collect +20 XP' : 'Continue'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Car Diagram */}
        <div className="lg:col-span-2">
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4 mb-4">
            <h3 className="text-white font-bold mb-3">Car Diagram</h3>
            <div className="bg-slate-900 rounded-lg p-4 relative" style={{ minHeight: 380 }}>
              {/* F1 Car - Top-down view */}
              <svg viewBox="0 0 500 280" className="w-full h-auto" style={{ overflow: 'visible' }}>
                {/* Car body group - pointer events disabled so dots are clickable */}
                <g style={{ pointerEvents: 'none' }}>
                {/* Grid floor reference */}
                <rect x="0" y="0" width="500" height="280" fill="#0f172a" />

                {/* Shadow */}
                <ellipse cx="250" cy="155" rx="210" ry="50" fill="#000" opacity="0.3" />

                {/* Front wing endplates */}
                <rect x="18" y="95" width="4" height="90" rx="2" fill={components.find(c => c.id === 'front-wing')?.installed ? '#2563eb' : '#334155'} />
                <rect x="18" y="95" width="4" height="90" rx="2" stroke="#475569" strokeWidth="0.5" fill="none" />

                {/* Front wing main plane */}
                <path d="M 22 100 L 60 115 L 60 165 L 22 180 Z" fill={components.find(c => c.id === 'front-wing')?.installed ? '#3b82f6' : '#334155'} stroke="#475569" strokeWidth="0.5" />
                {/* Front wing flaps */}
                <path d="M 30 108 L 55 118 L 55 162 L 30 172 Z" fill="none" stroke={components.find(c => c.id === 'front-wing')?.installed ? '#60a5fa' : '#475569'} strokeWidth="0.5" />

                {/* Nose cone */}
                <path d="M 60 120 L 100 128 L 100 152 L 60 160 Z" fill={components.find(c => c.id === 'monocoque')?.installed ? '#1e3a5f' : '#1e293b'} stroke="#334155" strokeWidth="0.5" />

                {/* Front tires */}
                <rect x="65" y="82" width="30" height="18" rx="4" fill={components.find(c => c.id === 'tires')?.installed ? '#111' : '#1e293b'} stroke={components.find(c => c.id === 'tires')?.installed ? '#f59e0b' : '#475569'} strokeWidth="1" />
                <rect x="65" y="180" width="30" height="18" rx="4" fill={components.find(c => c.id === 'tires')?.installed ? '#111' : '#1e293b'} stroke={components.find(c => c.id === 'tires')?.installed ? '#f59e0b' : '#475569'} strokeWidth="1" />

                {/* Front suspension arms */}
                <line x1="80" y1="100" x2="110" y2="128" stroke={components.find(c => c.id === 'front-suspension')?.installed ? '#94a3b8' : '#334155'} strokeWidth="1.5" />
                <line x1="80" y1="100" x2="120" y2="125" stroke={components.find(c => c.id === 'front-suspension')?.installed ? '#94a3b8' : '#334155'} strokeWidth="1" />
                <line x1="80" y1="180" x2="110" y2="152" stroke={components.find(c => c.id === 'front-suspension')?.installed ? '#94a3b8' : '#334155'} strokeWidth="1.5" />
                <line x1="80" y1="180" x2="120" y2="155" stroke={components.find(c => c.id === 'front-suspension')?.installed ? '#94a3b8' : '#334155'} strokeWidth="1" />

                {/* Monocoque / Survival Cell */}
                <path d="M 100 125 L 200 115 L 220 118 L 220 162 L 200 165 L 100 155 Z" fill={components.find(c => c.id === 'monocoque')?.installed ? '#1e3a5f' : '#1e293b'} stroke="#334155" strokeWidth="0.8" />

                {/* Cockpit opening */}
                <path d="M 140 130 L 190 125 L 195 128 L 195 152 L 190 155 L 140 150 Z" fill="#0a0e1a" stroke="#475569" strokeWidth="0.5" />

                {/* Halo */}
                <path d="M 150 140 L 165 128 Q 190 122 200 128 L 195 132" fill="none" stroke={components.find(c => c.id === 'halo')?.installed ? '#ef4444' : '#475569'} strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 150 140 L 165 152 Q 190 158 200 152 L 195 148" fill="none" stroke={components.find(c => c.id === 'halo')?.installed ? '#ef4444' : '#475569'} strokeWidth="2.5" strokeLinecap="round" />

                {/* Steering wheel area */}
                <circle cx="165" cy="140" r="6" fill={components.find(c => c.id === 'steering-wheel')?.installed ? '#22d3ee' : '#1e293b'} stroke="#475569" strokeWidth="0.5" />

                {/* Sidepods */}
                <path d="M 210 105 L 300 95 L 310 100 L 310 118 L 220 118 Z" fill={components.find(c => c.id === 'sidepods')?.installed ? '#1e3a5f' : '#1e293b'} stroke="#334155" strokeWidth="0.5" />
                <path d="M 210 175 L 300 185 L 310 180 L 310 162 L 220 162 Z" fill={components.find(c => c.id === 'sidepods')?.installed ? '#1e3a5f' : '#1e293b'} stroke="#334155" strokeWidth="0.5" />
                {/* Sidepod inlets */}
                <rect x="212" y="108" width="8" height="8" rx="1" fill={components.find(c => c.id === 'sidepods')?.installed ? '#0ea5e9' : '#475569'} opacity="0.6" />
                <rect x="212" y="164" width="8" height="8" rx="1" fill={components.find(c => c.id === 'sidepods')?.installed ? '#0ea5e9' : '#475569'} opacity="0.6" />

                {/* Floor edge */}
                <path d="M 120 112 L 350 90 L 355 92 L 355 188 L 350 190 L 120 168 Z" fill="none" stroke={components.find(c => c.id === 'floor')?.installed ? '#64748b' : '#1e293b'} strokeWidth="0.5" strokeDasharray="4 2" />

                {/* Engine bay */}
                <path d="M 310 118 L 360 125 L 360 155 L 310 162 Z" fill={components.find(c => c.id === 'engine')?.installed ? '#166534' : '#1e293b'} stroke="#334155" strokeWidth="0.5" />
                {components.find(c => c.id === 'engine')?.installed && (
                  <circle cx="335" cy="140" r="12" fill="#22c55e" opacity="0.08" />
                )}

                {/* ECU */}
                {components.find(c => c.id === 'ecu')?.installed && (
                  <rect x="230" y="133" width="12" height="14" rx="2" fill="#22d3ee" opacity="0.3" stroke="#22d3ee" strokeWidth="0.5" />
                )}

                {/* Battery */}
                <rect x="270" y="132" width="20" height="16" rx="2" fill={components.find(c => c.id === 'battery')?.installed ? '#8b5cf6' : '#1e293b'} stroke="#475569" strokeWidth="0.5" opacity="0.7" />

                {/* MGU-K */}
                {components.find(c => c.id === 'mgu-k')?.installed && (
                  <circle cx="345" cy="155" r="5" fill="#22c55e" opacity="0.4" stroke="#22c55e" strokeWidth="0.5" />
                )}
                {/* MGU-H */}
                {components.find(c => c.id === 'mgu-h')?.installed && (
                  <circle cx="355" cy="130" r="5" fill="#f97316" opacity="0.4" stroke="#f97316" strokeWidth="0.5" />
                )}

                {/* Fire suppression */}
                {components.find(c => c.id === 'fire-system')?.installed && (
                  <rect x="250" y="136" width="8" height="8" rx="1" fill="#ef4444" opacity="0.3" />
                )}

                {/* Gearbox */}
                <path d="M 360 128 L 400 133 L 400 147 L 360 152 Z" fill={components.find(c => c.id === 'gearbox')?.installed ? '#475569' : '#1e293b'} stroke="#334155" strokeWidth="0.5" />

                {/* Rear suspension arms */}
                <line x1="420" y1="95" x2="390" y2="130" stroke={components.find(c => c.id === 'rear-suspension')?.installed ? '#94a3b8' : '#334155'} strokeWidth="1.5" />
                <line x1="420" y1="95" x2="380" y2="128" stroke={components.find(c => c.id === 'rear-suspension')?.installed ? '#94a3b8' : '#334155'} strokeWidth="1" />
                <line x1="420" y1="185" x2="390" y2="150" stroke={components.find(c => c.id === 'rear-suspension')?.installed ? '#94a3b8' : '#334155'} strokeWidth="1.5" />
                <line x1="420" y1="185" x2="380" y2="152" stroke={components.find(c => c.id === 'rear-suspension')?.installed ? '#94a3b8' : '#334155'} strokeWidth="1" />

                {/* Rear tires */}
                <rect x="405" y="80" width="35" height="22" rx="5" fill={components.find(c => c.id === 'tires')?.installed ? '#111' : '#1e293b'} stroke={components.find(c => c.id === 'tires')?.installed ? '#f59e0b' : '#475569'} strokeWidth="1" />
                <rect x="405" y="178" width="35" height="22" rx="5" fill={components.find(c => c.id === 'tires')?.installed ? '#111' : '#1e293b'} stroke={components.find(c => c.id === 'tires')?.installed ? '#f59e0b' : '#475569'} strokeWidth="1" />

                {/* Diffuser */}
                <path d="M 400 120 L 445 100 L 450 102 L 450 178 L 445 180 L 400 160 Z" fill={components.find(c => c.id === 'floor')?.installed ? '#334155' : '#1e293b'} stroke="#475569" strokeWidth="0.5" />
                {/* Diffuser channels */}
                {components.find(c => c.id === 'floor')?.installed && (
                  <>
                    <line x1="410" y1="118" x2="445" y2="108" stroke="#64748b" strokeWidth="0.5" />
                    <line x1="410" y1="130" x2="445" y2="125" stroke="#64748b" strokeWidth="0.5" />
                    <line x1="410" y1="140" x2="445" y2="140" stroke="#64748b" strokeWidth="0.5" />
                    <line x1="410" y1="150" x2="445" y2="155" stroke="#64748b" strokeWidth="0.5" />
                    <line x1="410" y1="162" x2="445" y2="172" stroke="#64748b" strokeWidth="0.5" />
                  </>
                )}

                {/* Rear wing endplates */}
                <rect x="455" y="88" width="4" height="30" rx="1" fill={components.find(c => c.id === 'rear-wing')?.installed ? '#2563eb' : '#334155'} stroke="#475569" strokeWidth="0.5" />
                <rect x="455" y="162" width="4" height="30" rx="1" fill={components.find(c => c.id === 'rear-wing')?.installed ? '#2563eb' : '#334155'} stroke="#475569" strokeWidth="0.5" />
                {/* Rear wing main plane */}
                <rect x="458" y="92" width="6" height="96" rx="1" fill={components.find(c => c.id === 'rear-wing')?.installed ? '#3b82f6' : '#334155'} stroke="#475569" strokeWidth="0.5" />
                {/* DRS flap */}
                <rect x="465" y="96" width="4" height="88" rx="1" fill={components.find(c => c.id === 'rear-wing')?.installed ? '#60a5fa' : '#334155'} stroke="#475569" strokeWidth="0.5" />
                {/* Rear wing pillar */}
                <line x1="455" y1="140" x2="400" y2="140" stroke={components.find(c => c.id === 'rear-wing')?.installed ? '#334155' : '#1e293b'} strokeWidth="1.5" />

                </g>
                {/* Component clickable dots - with larger invisible hit targets */}
                {components.map(comp => {
                  // Map 0-100 position to 500x280 SVG
                  const cx = comp.position.x * 5;
                  const cy = comp.position.y * 3.5;
                  const isSelected = selectedId === comp.id;
                  return (
                    <g key={comp.id} onClick={() => setSelectedId(comp.id)} style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
                      {/* Invisible larger hit area */}
                      <circle cx={cx} cy={cy} r="15" fill="transparent" style={{ pointerEvents: 'auto' }} />
                      {/* Visible dot */}
                      <circle
                        cx={cx} cy={cy}
                        r={isSelected ? 8 : 6}
                        fill={comp.installed ? '#22c55e' : '#f59e0b'}
                        opacity={comp.installed ? 0.9 : 0.8}
                        className={!comp.installed ? 'pulse-dot' : ''}
                        stroke={isSelected ? '#8b5cf6' : '#0f172a'}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                      {/* Label on hover/select */}
                      {isSelected && (
                        <text x={cx} y={cy - 14} fill="#e2e8f0" fontSize="8" textAnchor="middle" fontWeight="bold">
                          {comp.name.split('(')[0].trim()}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Legend */}
              <div className="flex gap-4 mt-3 text-xs text-slate-400 justify-center">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent-green" /> Installed</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent-amber pulse-dot" /> Click to learn</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-xp-bar ring-2 ring-xp-bar/50" /> Selected</span>
              </div>
            </div>
          </div>

          {/* Selected component detail */}
          {selected ? (
            <div className="bg-racing-panel border border-racing-border rounded-xl p-5 slide-in">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-2xl mr-2">{selected.icon}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{
                    backgroundColor: `${CATEGORIES.find(c => c.id === selected.category)?.color}20`,
                    color: CATEGORIES.find(c => c.id === selected.category)?.color,
                  }}>
                    {selected.category}
                  </span>
                  <h3 className="text-white font-bold text-lg mt-1">{selected.name}</h3>
                </div>
                {!selected.installed && (
                  <button
                    onClick={() => installComponent(selected.id)}
                    className="px-4 py-2 bg-accent-green text-slate-900 rounded-lg font-bold text-sm hover:bg-accent-green/80 transition-colors"
                  >
                    ✅ Install (+20 XP)
                  </button>
                )}
                {selected.installed && (
                  <span className="text-accent-green font-bold text-sm">✅ Installed</span>
                )}
              </div>

              <p className="text-slate-300 text-sm mb-3">{selected.description}</p>

              <div className="bg-slate-900 rounded-lg p-4 mb-3">
                <h4 className="text-accent-cyan font-bold text-sm mb-2">Deep Dive</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{selected.deepDive}</p>
              </div>

              <div className="bg-accent-amber/10 border border-accent-amber/30 rounded-lg px-4 py-2 mb-3">
                <span className="text-accent-amber text-sm font-bold">Fun Fact:</span>
                <span className="text-slate-300 text-sm ml-1">{selected.funFact}</span>
              </div>

              {selected.formula && (
                <FormulaCard
                  title={selected.formula.title}
                  formula={selected.formula.formula}
                  description={selected.formula.description}
                />
              )}
            </div>
          ) : (
            <div className="bg-racing-panel border border-racing-border rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">🏎️</div>
              <h3 className="text-white font-bold mb-2">Select a Component</h3>
              <p className="text-slate-400 text-sm">Click a dot on the car diagram or choose from the parts list to learn what each component does and install it.</p>
            </div>
          )}
        </div>

        {/* Parts List */}
        <div className="lg:col-span-1">
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4 sticky top-4">
            <h3 className="text-white font-bold mb-3">Parts List</h3>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-1 mb-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFilter(cat.id)}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    filter === cat.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  style={filter === cat.id ? { backgroundColor: `${cat.color}30`, color: cat.color } : {}}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Component List */}
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {filtered.map(comp => (
                <button
                  key={comp.id}
                  onClick={() => setSelectedId(comp.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                    selectedId === comp.id
                      ? 'bg-xp-bar/20 border border-xp-bar/30'
                      : 'hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <span>{comp.icon}</span>
                  <span className={comp.installed ? 'text-slate-300' : 'text-white font-medium'}>{comp.name}</span>
                  <span className="ml-auto">
                    {comp.installed ? (
                      <span className="text-accent-green text-xs">✅</span>
                    ) : (
                      <span className="text-accent-amber text-xs">○</span>
                    )}
                  </span>
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="border-t border-racing-border mt-3 pt-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                  const catComps = components.filter(c => c.category === cat.id);
                  const catInstalled = catComps.filter(c => c.installed).length;
                  return (
                    <div key={cat.id}>
                      <div className="font-mono font-bold" style={{ color: cat.color }}>{catInstalled}/{catComps.length}</div>
                      <div className="text-slate-500">{cat.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
