import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';

// ─── TYPES ─────────────────────────────────────────────────────────────────
type GameTab = 'shorts' | 'thisOrThat' | 'completePicture' | 'matchPairs';

interface LearningShort {
  id: string;
  category: string;
  icon: string;
  title: string;
  fact: string;
  didYouKnow: string;
}

interface ThisOrThatQ {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  answer: 'A' | 'B';
  explanation: string;
}

interface CompletePictureQ {
  id: string;
  sentence: string;
  blank: string;
  options: string[];
  correctIndex: number;
  fullExplanation: string;
}

interface MatchPairCard {
  id: number;
  text: string;
  pairId: number;
  flipped: boolean;
  matched: boolean;
}

// ─── DATA ──────────────────────────────────────────────────────────────────

const LEARNING_SHORTS: LearningShort[] = [
  { id: 'ls-1', category: 'Aero', icon: '💨', title: 'Downforce Monster', fact: 'An F1 car produces enough downforce to drive upside down on a ceiling at around 130 mph.', didYouKnow: 'The floor generates about 50% of total downforce, making it the single most important aero surface.' },
  { id: 'ls-2', category: 'Tyres', icon: '🛞', title: 'Rubber Science', fact: 'F1 tyres operate at around 100-110°C for optimal grip. Too cold or too hot and performance drops dramatically.', didYouKnow: 'Pirelli brings over 1,800 tyres to each race weekend across all teams.' },
  { id: 'ls-3', category: 'Engine', icon: '⚡', title: 'Power Unit Beast', fact: 'The 1.6L V6 turbo hybrid power unit produces over 1,000 horsepower — more than 600hp per litre.', didYouKnow: 'The turbo spins at up to 125,000 RPM — that is over 2,000 revolutions per second.' },
  { id: 'ls-4', category: 'Strategy', icon: '🧠', title: 'Tyre Strategy', fact: 'Teams must use at least 2 different tyre compounds during a dry race, forcing at least one pit stop.', didYouKnow: 'The undercut works because fresh tyres on low fuel can be 2-3 seconds faster per lap.' },
  { id: 'ls-5', category: 'Safety', icon: '🛡️', title: 'Halo Hero', fact: 'The titanium Halo can withstand the weight of a London double-decker bus (12 tonnes) on top of it.', didYouKnow: 'The Halo was introduced in 2018 and has been credited with saving multiple lives since.' },
  { id: 'ls-6', category: 'Materials', icon: '🧬', title: 'Carbon Fibre Magic', fact: 'An F1 car monocoque is made of over 12,000 pieces of carbon fibre, layered and baked in an autoclave.', didYouKnow: 'Carbon fibre is 5x stronger than steel but 5x lighter, making it perfect for racing.' },
  { id: 'ls-7', category: 'DRS', icon: '📐', title: 'DRS Boost', fact: 'DRS (Drag Reduction System) opens a flap on the rear wing, reducing drag by about 20% and adding ~15 km/h on straights.', didYouKnow: 'DRS can only be used when a car is within 1 second of the car ahead at designated detection points.' },
  { id: 'ls-8', category: 'Pit Stops', icon: '🔧', title: 'Lightning Pit Stops', fact: 'The fastest pit stops take under 2 seconds. Red Bull holds the record at approximately 1.80 seconds.', didYouKnow: 'A pit crew has around 20 people working simultaneously — 3 per wheel plus jack operators and wing adjusters.' },
  { id: 'ls-9', category: 'Fuel', icon: '⛽', title: 'Fuel Efficiency', fact: 'F1 cars start a race with up to 110 kg of fuel and must manage consumption to finish the race distance.', didYouKnow: 'Fuel flow is limited to 100 kg/hour. Teams use fuel strategically — sometimes \"lift and coast\" to save fuel.' },
  { id: 'ls-10', category: 'ERS', icon: '🔋', title: 'Energy Recovery', fact: 'The ERS harvests energy from braking (MGU-K) and exhaust heat (MGU-H), deploying up to 163 hp extra per lap.', didYouKnow: 'The MGU-K can harvest up to 2 MJ of energy per lap and deploy up to 4 MJ thanks to the MGU-H loop.' },
  { id: 'ls-11', category: 'Telemetry', icon: '📡', title: 'Data Stream', fact: 'An F1 car has over 300 sensors generating about 1.5 TB of data per race weekend.', didYouKnow: 'Teams transmit data to their factories in real-time — engineers at HQ help make strategy calls during the race.' },
  { id: 'ls-12', category: 'G-Forces', icon: '🌀', title: 'G-Force Warriors', fact: 'Drivers experience up to 6G under braking and 5G in high-speed corners — fighter pilots rarely exceed 9G.', didYouKnow: 'A driver\'s head and helmet weigh about 7 kg, but feel like 42 kg under 6G braking.' },
  { id: 'ls-13', category: 'Braking', icon: '🔴', title: 'Brake Power', fact: 'F1 brakes can slow a car from 300 km/h to 80 km/h in under 4 seconds, reaching temperatures of 1,000°C.', didYouKnow: 'Brake discs glow red-hot and are made of carbon-carbon composite that works better when extremely hot.' },
  { id: 'ls-14', category: 'Steering', icon: '🎮', title: 'Steering Wheel Tech', fact: 'An F1 steering wheel has over 20 buttons, switches, and rotary dials — it costs around $50,000 to make.', didYouKnow: 'Drivers can adjust brake balance, differential, engine modes, and ERS deployment all from the wheel while racing.' },
  { id: 'ls-15', category: 'Wind Tunnel', icon: '🌬️', title: 'Wind Tunnel Testing', fact: 'Teams are limited to specific wind tunnel hours based on championship position — the lower you finish, the more time you get.', didYouKnow: 'Wind tunnel models are typically 60% scale, running at up to 50 m/s with a rolling road beneath.' },
  { id: 'ls-16', category: 'Aero', icon: '💨', title: 'Vortex Generators', fact: 'Tiny fins and bargeboards create controlled vortices that direct airflow around the car for maximum efficiency.', didYouKnow: 'Ground effect cars use Venturi tunnels under the floor — air accelerates underneath, creating low pressure that sucks the car down.' },
  { id: 'ls-17', category: 'Tyres', icon: '🛞', title: 'Tyre Compounds', fact: 'Pirelli supplies 5 dry compounds (C1-C5) from hardest to softest, plus intermediate and full wet tyres.', didYouKnow: 'The softest compound (C5) can be over 2 seconds per lap faster than the hardest (C1), but degrades much quicker.' },
  { id: 'ls-18', category: 'Engine', icon: '⚡', title: 'RPM Limits', fact: 'Modern F1 engines are limited to 15,000 RPM. In the V10 era, engines screamed at over 19,000 RPM.', didYouKnow: 'Each driver is allowed only 3 power unit components per season — exceed it and you get grid penalties.' },
];

const THIS_OR_THAT_QUESTIONS: ThisOrThatQ[] = [
  { id: 'tot-1', question: 'Which generates MORE downforce?', optionA: 'Front Wing', optionB: 'Rear Wing', answer: 'B', explanation: 'The rear wing generates more downforce than the front wing, though the floor actually generates the most overall.' },
  { id: 'tot-2', question: 'Which is HEAVIER?', optionA: 'Full fuel load (110 kg)', optionB: 'Driver + seat (~80 kg)', answer: 'A', explanation: 'A full fuel load is about 110 kg, significantly heavier than the driver and seat combined at roughly 80 kg.' },
  { id: 'tot-3', question: 'Which is FASTER?', optionA: 'Pit stop (Red Bull record)', optionB: 'Blink of an eye', answer: 'A', explanation: 'Red Bull\'s record pit stop is about 1.80 seconds, while a blink takes 0.3-0.4 seconds. The pit stop is slower — your blink is faster!' },
  { id: 'tot-4', question: 'Which has MORE buttons?', optionA: 'Xbox controller (~17)', optionB: 'F1 steering wheel (~25)', answer: 'B', explanation: 'An F1 steering wheel has over 20 buttons, dials, and switches compared to about 17 on an Xbox controller.' },
  { id: 'tot-5', question: 'Which is HOTTER?', optionA: 'F1 brake disc (~1000°C)', optionB: 'Volcanic lava (~1100°C)', answer: 'B', explanation: 'Volcanic lava is slightly hotter at around 1100°C, but F1 brakes at 1000°C are remarkably close!' },
  { id: 'tot-6', question: 'Which produces MORE power?', optionA: 'F1 Power Unit (~1000hp)', optionB: 'Bugatti Chiron (~1500hp)', answer: 'B', explanation: 'The Bugatti Chiron produces about 1500 hp vs an F1 car\'s ~1000 hp, but the F1 car is much lighter and faster.' },
  { id: 'tot-7', question: 'Which weighs MORE?', optionA: 'F1 car (798 kg minimum)', optionB: 'Grand piano (~500 kg)', answer: 'A', explanation: 'An F1 car must weigh at least 798 kg including the driver, compared to a grand piano at about 500 kg.' },
  { id: 'tot-8', question: 'Which spins FASTER?', optionA: 'F1 turbo (125,000 RPM)', optionB: 'Jet engine (20,000 RPM)', answer: 'A', explanation: 'An F1 turbocharger spins at up to 125,000 RPM — over 6 times faster than a typical jet engine compressor.' },
  { id: 'tot-9', question: 'Which has MORE sensors?', optionA: 'F1 car (~300)', optionB: 'Boeing 787 (~6000)', answer: 'B', explanation: 'A Boeing 787 has about 6,000 sensors vs an F1 car\'s 300, but F1 generates more data per sensor per second.' },
  { id: 'tot-10', question: 'Which stops FASTER from 200 km/h?', optionA: 'F1 car', optionB: 'Road sports car', answer: 'A', explanation: 'An F1 car stops from 200 km/h in about 65 metres — a road sports car needs roughly double that distance.' },
  { id: 'tot-11', question: 'Which is STRONGER per weight?', optionA: 'Steel', optionB: 'Carbon fibre', answer: 'B', explanation: 'Carbon fibre is about 5x stronger than steel while being 5x lighter, giving it a far superior strength-to-weight ratio.' },
  { id: 'tot-12', question: 'Which has a HIGHER top speed?', optionA: 'F1 car (~370 km/h)', optionB: 'IndyCar (~380 km/h)', answer: 'B', explanation: 'IndyCars can reach slightly higher top speeds on ovals, around 380 km/h, thanks to lower downforce setups.' },
  { id: 'tot-13', question: 'Which cools MORE air per second?', optionA: 'F1 car radiator', optionB: 'Home air conditioner', answer: 'A', explanation: 'An F1 car\'s cooling system handles far more thermal energy per second than any home air conditioning unit.' },
  { id: 'tot-14', question: 'Which costs MORE?', optionA: 'F1 steering wheel (~$50k)', optionB: 'Brand new economy car (~$25k)', answer: 'A', explanation: 'An F1 steering wheel costs about $50,000 — double the price of many brand new economy cars!' },
  { id: 'tot-15', question: 'Which experiences MORE G-force?', optionA: 'F1 driver braking (~6G)', optionB: 'Astronaut at launch (~3G)', answer: 'A', explanation: 'F1 drivers experience up to 6G under heavy braking, double what astronauts feel during a rocket launch.' },
  { id: 'tot-16', question: 'Which is LONGER?', optionA: 'Monaco GP circuit (3.3 km)', optionB: 'Spa circuit (7.0 km)', answer: 'B', explanation: 'Spa-Francorchamps at 7.0 km is more than double the length of the famous Monaco street circuit at 3.3 km.' },
];

const COMPLETE_PICTURE_QUESTIONS: CompletePictureQ[] = [
  { id: 'cp-1', sentence: 'Downforce formula: F = ½ × ρ × v² × ___ × A', blank: '___', options: ['Cl', 'Cd', 'μ', 'π'], correctIndex: 0, fullExplanation: 'Cl is the lift coefficient (negative for downforce). This formula shows why downforce increases with the square of velocity.' },
  { id: 'cp-2', sentence: 'The ___ generates about 50% of all downforce on a modern F1 car.', blank: '___', options: ['Floor', 'Front Wing', 'Rear Wing', 'Sidepods'], correctIndex: 0, fullExplanation: 'The floor, using ground effect and Venturi tunnels, generates roughly half of all downforce on modern F1 cars.' },
  { id: 'cp-3', sentence: 'F1 brakes can reach temperatures of ___°C during heavy braking.', blank: '___', options: ['500', '750', '1000', '1200'], correctIndex: 2, fullExplanation: 'F1 carbon-carbon brake discs can reach around 1000°C. They actually work better at high temperatures.' },
  { id: 'cp-4', sentence: 'An F1 car\'s minimum weight including the driver is ___ kg.', blank: '___', options: ['598', '698', '798', '898'], correctIndex: 2, fullExplanation: 'The minimum weight is 798 kg including the driver. Teams add ballast to reach exactly this weight for optimal balance.' },
  { id: 'cp-5', sentence: 'The MGU-K can deploy up to ___ MJ of energy per lap.', blank: '___', options: ['2', '4', '6', '8'], correctIndex: 1, fullExplanation: 'The MGU-K can deploy up to 4 MJ per lap (harvesting 2 MJ directly, with extra looped via the MGU-H).' },
  { id: 'cp-6', sentence: 'F1 fuel flow is limited to ___ kg per hour.', blank: '___', options: ['80', '90', '100', '110'], correctIndex: 2, fullExplanation: 'The maximum fuel flow rate is 100 kg/hour, forcing teams to manage fuel consumption carefully throughout the race.' },
  { id: 'cp-7', sentence: 'DRS gives a top speed boost of approximately ___ km/h.', blank: '___', options: ['5', '10', '15', '25'], correctIndex: 2, fullExplanation: 'DRS typically adds around 15 km/h by opening the rear wing flap and reducing aerodynamic drag by about 20%.' },
  { id: 'cp-8', sentence: 'The F1 turbocharger spins at up to ___ RPM.', blank: '___', options: ['50,000', '75,000', '100,000', '125,000'], correctIndex: 3, fullExplanation: 'The turbocharger spins at an incredible 125,000 RPM — over 2,000 revolutions every single second.' },
  { id: 'cp-9', sentence: 'Each driver is allowed ___ engines per season before penalties.', blank: '___', options: ['2', '3', '4', '5'], correctIndex: 1, fullExplanation: 'Drivers get 3 of each power unit component per season. Using a 4th triggers grid penalties to control costs.' },
  { id: 'cp-10', sentence: 'F1 drivers experience up to ___G under heavy braking.', blank: '___', options: ['3', '4', '5', '6'], correctIndex: 3, fullExplanation: 'Under maximum braking, drivers experience around 6G — their body and head feel 6 times heavier than normal.' },
  { id: 'cp-11', sentence: 'Wind tunnel models are typically ___% scale.', blank: '___', options: ['40', '50', '60', '80'], correctIndex: 2, fullExplanation: 'Wind tunnel models are 60% scale, a regulation that balances accuracy with cost and tunnel size requirements.' },
  { id: 'cp-12', sentence: 'An F1 car generates approximately ___ TB of data per race weekend.', blank: '___', options: ['0.5', '1.0', '1.5', '2.0'], correctIndex: 2, fullExplanation: 'Over 300 sensors generate about 1.5 TB of data per race weekend, all analyzed in real-time by engineers.' },
  { id: 'cp-13', sentence: 'The Halo can withstand ___ tonnes of force.', blank: '___', options: ['6', '8', '10', '12'], correctIndex: 3, fullExplanation: 'The titanium Halo can withstand 12 tonnes — equivalent to the weight of a London double-decker bus.' },
  { id: 'cp-14', sentence: 'Pirelli supplies ___ different dry tyre compounds (C1-C5).', blank: '___', options: ['3', '4', '5', '6'], correctIndex: 2, fullExplanation: 'There are 5 dry compounds (C1 hardest to C5 softest), plus intermediate and full wet tyres for rain.' },
  { id: 'cp-15', sentence: 'A pit crew has around ___ people working simultaneously.', blank: '___', options: ['12', '16', '20', '24'], correctIndex: 2, fullExplanation: 'About 20 crew members work simultaneously: 3 per wheel (12), 2 jack operators, plus wing and stabiliser crew.' },
];

const MATCH_PAIRS_SETS: { term: string; definition: string }[][] = [
  [
    { term: 'Monocoque', definition: 'Carbon fibre survival cell' },
    { term: 'DRS', definition: 'Drag Reduction System' },
    { term: 'MGU-K', definition: 'Recovers kinetic braking energy' },
    { term: 'Diffuser', definition: 'Expands airflow under the car' },
    { term: 'Halo', definition: 'Titanium head protection' },
    { term: 'ECU', definition: 'Standard electronics unit' },
    { term: 'Pirelli', definition: 'Sole F1 tyre supplier' },
    { term: 'ERS', definition: 'Energy Recovery System' },
  ],
  [
    { term: 'Bargeboards', definition: 'Direct airflow around sidepods' },
    { term: 'Plank', definition: 'Wooden wear strip under floor' },
    { term: 'MGU-H', definition: 'Recovers exhaust heat energy' },
    { term: 'Endplate', definition: 'Controls wing tip vortices' },
    { term: 'HANS', definition: 'Head and neck support device' },
    { term: 'Turbo', definition: 'Spins at 125,000 RPM' },
    { term: 'Parc fermé', definition: 'No car changes after qualifying' },
    { term: 'Undercut', definition: 'Pit early for fresh tyre advantage' },
  ],
  [
    { term: 'Venturi tunnel', definition: 'Accelerates air under floor' },
    { term: 'Brake bias', definition: 'Front vs rear brake balance' },
    { term: 'Differential', definition: 'Controls inner/outer wheel speed' },
    { term: 'Anti-stall', definition: 'Prevents engine stalling' },
    { term: 'Formation lap', definition: 'Warm-up lap before race start' },
    { term: 'Safety Car', definition: 'Neutralises race during incidents' },
    { term: 'Blue flag', definition: 'Let faster car pass immediately' },
    { term: 'Slipstream', definition: 'Low-drag zone behind a car' },
  ],
];

// ─── HELPERS ───────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── TAB DEFINITIONS ──────────────────────────────────────────────────────

const TABS: { id: GameTab; label: string; icon: string }[] = [
  { id: 'shorts', label: 'Learning Shorts', icon: '🎬' },
  { id: 'thisOrThat', label: 'This or That', icon: '⚡' },
  { id: 'completePicture', label: 'Complete the Picture', icon: '🧩' },
  { id: 'matchPairs', label: 'Match Pairs', icon: '🃏' },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function PitStopGames() {
  const { dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<GameTab>('shorts');
  const [sessionXP, setSessionXP] = useState(0);

  const addXP = useCallback((amount: number) => {
    dispatch({ type: 'ADD_XP', amount });
    setSessionXP(prev => prev + amount);
  }, [dispatch]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white mb-1">🎮 Pit Stop Games</h1>
        <p className="text-slate-400 text-sm">Quick-fire mini-games to test your F1 engineering knowledge</p>
        <div className="mt-2 inline-flex items-center gap-2 bg-racing-panel border border-racing-border rounded-lg px-3 py-1.5 text-sm">
          <span className="text-accent-amber font-bold">⚡ {sessionXP} XP</span>
          <span className="text-slate-500">earned this session</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-racing-panel rounded-xl p-1 border border-racing-border overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-slate-700 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pit-stop-tab-content">
        {activeTab === 'shorts' && <LearningShortsGame addXP={addXP} />}
        {activeTab === 'thisOrThat' && <ThisOrThatGame addXP={addXP} />}
        {activeTab === 'completePicture' && <CompletePictureGame addXP={addXP} />}
        {activeTab === 'matchPairs' && <MatchPairsGame addXP={addXP} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. LEARNING SHORTS
// ═══════════════════════════════════════════════════════════════════════════

function LearningShortsGame({ addXP }: { addXP: (n: number) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [readShorts, setReadShorts] = useState<Set<string>>(new Set());
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const short = LEARNING_SHORTS[currentIndex];

  const markRead = useCallback((idx: number) => {
    const s = LEARNING_SHORTS[idx];
    if (!readShorts.has(s.id)) {
      setReadShorts(prev => {
        const next = new Set(prev);
        next.add(s.id);
        return next;
      });
      addXP(5);
    }
  }, [readShorts, addXP]);

  // Mark current as read after a brief delay
  useEffect(() => {
    const timer = setTimeout(() => markRead(currentIndex), 1500);
    return () => clearTimeout(timer);
  }, [currentIndex, markRead]);

  const goNext = () => {
    if (currentIndex < LEARNING_SHORTS.length - 1) {
      setSlideDir('left');
      setTimeout(() => { setCurrentIndex(i => i + 1); setSlideDir(null); }, 200);
    }
  };
  const goPrev = () => {
    if (currentIndex > 0) {
      setSlideDir('right');
      setTimeout(() => { setCurrentIndex(i => i - 1); setSlideDir(null); }, 200);
    }
  };

  return (
    <div>
      <div className="text-center mb-4 text-sm text-slate-400">
        {readShorts.size}/{LEARNING_SHORTS.length} read &middot; {readShorts.size * 5} XP earned
      </div>

      <div className={`bg-racing-panel border border-racing-border rounded-2xl p-6 max-w-lg mx-auto transition-all duration-200 ${
        slideDir === 'left' ? 'pit-stop-slide-left' : slideDir === 'right' ? 'pit-stop-slide-right' : 'pit-stop-slide-in'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{short.icon}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-accent-cyan">{short.category}</span>
          {readShorts.has(short.id) && <span className="ml-auto text-accent-green text-xs">✓ Read</span>}
        </div>
        <h3 className="text-xl font-black text-white mb-3">{short.title}</h3>
        <p className="text-slate-300 text-sm leading-relaxed mb-4">{short.fact}</p>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-accent-amber font-semibold mb-1">💡 Did you know?</p>
          <p className="text-xs text-slate-400 leading-relaxed">{short.didYouKnow}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
        >
          ← Previous
        </button>
        <span className="text-slate-400 text-sm font-mono">{currentIndex + 1}/{LEARNING_SHORTS.length}</span>
        <button
          onClick={goNext}
          disabled={currentIndex === LEARNING_SHORTS.length - 1}
          className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
        >
          Next →
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-4 flex-wrap">
        {LEARNING_SHORTS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrentIndex(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i === currentIndex ? 'bg-accent-cyan scale-125' : readShorts.has(s.id) ? 'bg-accent-green/60' : 'bg-slate-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. THIS OR THAT
// ═══════════════════════════════════════════════════════════════════════════

function ThisOrThatGame({ addXP }: { addXP: (n: number) => void }) {
  const [questions, setQuestions] = useState(() => shuffle(THIS_OR_THAT_QUESTIONS));
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<'A' | 'B' | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[qIndex];

  const handleChoice = (choice: 'A' | 'B') => {
    if (selected) return;
    setSelected(choice);
    setTotal(t => t + 1);
    if (choice === q.answer) {
      setScore(s => s + 1);
      addXP(10);
    }
  };

  const nextQuestion = () => {
    if (qIndex < questions.length - 1) {
      setSelected(null);
      setQIndex(i => i + 1);
    } else {
      setFinished(true);
    }
  };

  const restart = () => {
    setQuestions(shuffle(THIS_OR_THAT_QUESTIONS));
    setQIndex(0);
    setSelected(null);
    setScore(0);
    setTotal(0);
    setFinished(false);
  };

  if (finished) {
    const pct = Math.round((score / total) * 100);
    return (
      <div className="bg-racing-panel border border-racing-border rounded-2xl p-8 max-w-lg mx-auto text-center">
        <h3 className="text-2xl font-black text-white mb-2">Round Complete!</h3>
        <p className="text-4xl font-black text-accent-cyan mb-2">{score}/{total}</p>
        <p className="text-slate-400 mb-1">{pct}% correct</p>
        <p className="text-accent-amber text-sm mb-6">+{score * 10} XP earned</p>
        <button onClick={restart} className="px-6 py-2.5 rounded-lg bg-racing-red text-white font-bold hover:bg-red-500 transition-colors">
          Play Again 🔄
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-4 text-sm text-slate-400">
        Question {qIndex + 1}/{questions.length} &middot; Score: {score}/{total}
      </div>

      <div className="bg-racing-panel border border-racing-border rounded-2xl p-6 max-w-lg mx-auto">
        <h3 className="text-lg font-bold text-white text-center mb-6">{q.question}</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {(['A', 'B'] as const).map(opt => {
            const text = opt === 'A' ? q.optionA : q.optionB;
            const isCorrect = q.answer === opt;
            let btnClass = 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-white';
            if (selected) {
              if (isCorrect) btnClass = 'bg-green-900/50 border-accent-green text-accent-green pit-stop-pulse-correct';
              else if (selected === opt) btnClass = 'bg-red-900/50 border-racing-red text-racing-red pit-stop-shake';
              else btnClass = 'bg-slate-800 border-slate-700 text-slate-500';
            }
            return (
              <button
                key={opt}
                onClick={() => handleChoice(opt)}
                disabled={!!selected}
                className={`p-4 rounded-xl border-2 font-bold text-center transition-all ${btnClass} ${!selected ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {text}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="pit-stop-fade-in">
            <div className={`rounded-lg p-3 mb-4 text-sm ${
              selected === q.answer ? 'bg-green-900/20 border border-green-800/30 text-green-300' : 'bg-red-900/20 border border-red-800/30 text-red-300'
            }`}>
              <p className="font-bold mb-1">{selected === q.answer ? '✅ Correct!' : '❌ Not quite!'}</p>
              <p className="text-slate-300 text-xs">{q.explanation}</p>
            </div>
            <button onClick={nextQuestion} className="w-full py-2.5 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors">
              {qIndex < questions.length - 1 ? 'Next Question →' : 'See Results'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. COMPLETE THE PICTURE
// ═══════════════════════════════════════════════════════════════════════════

function CompletePictureGame({ addXP }: { addXP: (n: number) => void }) {
  const [questions] = useState(() => shuffle(COMPLETE_PICTURE_QUESTIONS));
  const [qIndex, setQIndex] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[qIndex];

  const handlePick = (idx: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);
    setTotal(t => t + 1);
    if (idx === q.correctIndex) {
      setScore(s => s + 1);
      addXP(10);
    }
  };

  const nextQuestion = () => {
    if (qIndex < questions.length - 1) {
      setSelectedIdx(null);
      setQIndex(i => i + 1);
    } else {
      setFinished(true);
    }
  };

  const restart = () => {
    setQIndex(0);
    setSelectedIdx(null);
    setScore(0);
    setTotal(0);
    setFinished(false);
  };

  if (finished) {
    const pct = Math.round((score / total) * 100);
    return (
      <div className="bg-racing-panel border border-racing-border rounded-2xl p-8 max-w-lg mx-auto text-center">
        <h3 className="text-2xl font-black text-white mb-2">Round Complete!</h3>
        <p className="text-4xl font-black text-accent-cyan mb-2">{score}/{total}</p>
        <p className="text-slate-400 mb-1">{pct}% correct</p>
        <p className="text-accent-amber text-sm mb-6">+{score * 10} XP earned</p>
        <button onClick={restart} className="px-6 py-2.5 rounded-lg bg-racing-red text-white font-bold hover:bg-red-500 transition-colors">
          Play Again 🔄
        </button>
      </div>
    );
  }

  // Build the display sentence with highlighted blank
  const sentenceParts = q.sentence.split(q.blank);

  return (
    <div>
      <div className="text-center mb-4 text-sm text-slate-400">
        Question {qIndex + 1}/{questions.length} &middot; Score: {score}/{total}
      </div>

      <div className="bg-racing-panel border border-racing-border rounded-2xl p-6 max-w-lg mx-auto">
        <p className="text-lg text-white font-semibold text-center mb-6 leading-relaxed">
          {sentenceParts.map((part, i) => (
            <span key={i}>
              {part}
              {i < sentenceParts.length - 1 && (
                <span className="inline-block mx-1 px-3 py-0.5 bg-accent-cyan/20 border border-accent-cyan/40 rounded text-accent-cyan font-black">
                  {selectedIdx !== null ? q.options[q.correctIndex] : '???'}
                </span>
              )}
            </span>
          ))}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex;
            let btnClass = 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-white';
            if (selectedIdx !== null) {
              if (isCorrect) btnClass = 'bg-green-900/50 border-accent-green text-accent-green pit-stop-pulse-correct';
              else if (selectedIdx === i) btnClass = 'bg-red-900/50 border-racing-red text-racing-red pit-stop-shake';
              else btnClass = 'bg-slate-800 border-slate-700 text-slate-500';
            }
            return (
              <button
                key={i}
                onClick={() => handlePick(i)}
                disabled={selectedIdx !== null}
                className={`p-3 rounded-xl border-2 font-bold text-center transition-all ${btnClass} ${selectedIdx === null ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {selectedIdx !== null && (
          <div className="pit-stop-fade-in">
            <div className={`rounded-lg p-3 mb-4 text-sm ${
              selectedIdx === q.correctIndex ? 'bg-green-900/20 border border-green-800/30 text-green-300' : 'bg-red-900/20 border border-red-800/30 text-red-300'
            }`}>
              <p className="font-bold mb-1">{selectedIdx === q.correctIndex ? '✅ Correct!' : '❌ Not quite!'}</p>
              <p className="text-slate-300 text-xs">{q.fullExplanation}</p>
            </div>
            <button onClick={nextQuestion} className="w-full py-2.5 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors">
              {qIndex < questions.length - 1 ? 'Next Question →' : 'See Results'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. MATCH PAIRS
// ═══════════════════════════════════════════════════════════════════════════

function MatchPairsGame({ addXP }: { addXP: (n: number) => void }) {
  const [setIndex, setSetIndex] = useState(() => Math.floor(Math.random() * MATCH_PAIRS_SETS.length));
  const [cards, setCards] = useState<MatchPairCard[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsed, setElapsed] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const lockRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const initGame = useCallback((si: number) => {
    const pairs = MATCH_PAIRS_SETS[si];
    const cardList: MatchPairCard[] = [];
    pairs.forEach((pair, idx) => {
      cardList.push({ id: idx * 2, text: pair.term, pairId: idx, flipped: false, matched: false });
      cardList.push({ id: idx * 2 + 1, text: pair.definition, pairId: idx, flipped: false, matched: false });
    });
    setCards(shuffle(cardList));
    setFlippedIds([]);
    setMoves(0);
    setMatchedPairs(0);
    setStartTime(Date.now());
    setElapsed(0);
    setGameComplete(false);
    lockRef.current = false;
  }, []);

  useEffect(() => { initGame(setIndex); }, [setIndex, initGame]);

  useEffect(() => {
    if (gameComplete || startTime === 0) return;
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(timerRef.current);
  }, [startTime, gameComplete]);

  const handleCardClick = (card: MatchPairCard) => {
    if (lockRef.current || card.flipped || card.matched || flippedIds.length >= 2) return;

    const newCards = cards.map(c => c.id === card.id ? { ...c, flipped: true } : c);
    setCards(newCards);
    const newFlipped = [...flippedIds, card.id];
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      lockRef.current = true;
      const first = newCards.find(c => c.id === newFlipped[0])!;
      const second = newCards.find(c => c.id === newFlipped[1])!;

      if (first.pairId === second.pairId) {
        // Match found
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.pairId === first.pairId ? { ...c, matched: true, flipped: true } : c
          ));
          setFlippedIds([]);
          lockRef.current = false;
          const newMatched = matchedPairs + 1;
          setMatchedPairs(newMatched);
          if (newMatched === 8) {
            setGameComplete(true);
            clearInterval(timerRef.current);
            // XP: base 30, bonus for fewer moves
            const bonus = Math.max(0, 50 - moves * 2);
            addXP(30 + bonus);
          }
        }, 500);
      } else {
        // No match — flip back
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            newFlipped.includes(c.id) ? { ...c, flipped: false } : c
          ));
          setFlippedIds([]);
          lockRef.current = false;
        }, 800);
      }
    }
  };

  const reshuffle = () => {
    const next = (setIndex + 1) % MATCH_PAIRS_SETS.length;
    setSetIndex(next);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (gameComplete) {
    const bonus = Math.max(0, 50 - (moves - 1) * 2);
    const totalXP = 30 + bonus;
    return (
      <div className="bg-racing-panel border border-racing-border rounded-2xl p-8 max-w-lg mx-auto text-center">
        <h3 className="text-2xl font-black text-white mb-2">All Pairs Matched! 🎉</h3>
        <div className="grid grid-cols-3 gap-4 my-6">
          <div>
            <p className="text-2xl font-black text-accent-cyan">{moves}</p>
            <p className="text-xs text-slate-400">Moves</p>
          </div>
          <div>
            <p className="text-2xl font-black text-accent-amber">{formatTime(elapsed)}</p>
            <p className="text-xs text-slate-400">Time</p>
          </div>
          <div>
            <p className="text-2xl font-black text-accent-green">+{totalXP}</p>
            <p className="text-xs text-slate-400">XP Earned</p>
          </div>
        </div>
        <button onClick={reshuffle} className="px-6 py-2.5 rounded-lg bg-racing-red text-white font-bold hover:bg-red-500 transition-colors">
          New Set 🔄
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4 text-sm text-slate-400 max-w-lg mx-auto">
        <span>Moves: {moves}</span>
        <span>Pairs: {matchedPairs}/8</span>
        <span>Time: {formatTime(elapsed)}</span>
      </div>

      <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card)}
            className={`relative h-24 rounded-xl font-semibold text-xs transition-all duration-300 border-2 ${
              card.matched
                ? 'bg-green-900/30 border-accent-green text-accent-green cursor-default'
                : card.flipped
                  ? 'bg-slate-700 border-accent-cyan text-white pit-stop-card-flip'
                  : 'bg-slate-800 border-slate-600 text-slate-800 hover:border-slate-500 cursor-pointer pit-stop-card-back'
            }`}
            disabled={card.matched}
          >
            <span className={`absolute inset-0 flex items-center justify-center p-2 text-center leading-tight transition-opacity duration-200 ${
              card.flipped || card.matched ? 'opacity-100' : 'opacity-0'
            }`}>
              {card.text}
            </span>
            <span className={`absolute inset-0 flex items-center justify-center text-2xl transition-opacity duration-200 ${
              card.flipped || card.matched ? 'opacity-0' : 'opacity-100'
            }`}>
              🏎️
            </span>
          </button>
        ))}
      </div>

      <div className="text-center mt-4">
        <button onClick={reshuffle} className="text-sm text-slate-400 hover:text-white transition-colors underline">
          Reshuffle with new set
        </button>
      </div>
    </div>
  );
}
