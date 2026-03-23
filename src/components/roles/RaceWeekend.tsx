import { useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { tracks, getTrack } from '../../data/tracks';
import { simulateLap, defaultSetup } from '../../utils/simulation';
import { tireDegradation, pitStopLoss, round } from '../../utils/physics';
import { XP_REWARDS } from '../../utils/xp';
import type { CarSetup } from '../../types';
import XPPopup from '../shared/XPPopup';

type Session = 'briefing' | 'fp1' | 'fp2' | 'qualifying' | 'race' | 'debrief';
type TireCompound = 'soft' | 'medium' | 'hard';

interface LapRecord {
  session: string;
  lapTime: number;
  compound: TireCompound;
  notes: string;
}

const COMPOUND_COLORS: Record<TireCompound, string> = { soft: '#ef4444', medium: '#f59e0b', hard: '#94a3b8' };
const COMPOUND_DELTA: Record<TireCompound, number> = { soft: -1.2, medium: 0, hard: 0.6 };

const SESSION_INFO: Record<Session, { title: string; icon: string; desc: string }> = {
  briefing: { title: 'Pre-Race Briefing', icon: '📋', desc: 'Understand the track and plan your weekend' },
  fp1: { title: 'Free Practice 1', icon: '🏗️', desc: 'Baseline setup — understand the car on this track' },
  fp2: { title: 'Free Practice 2', icon: '🔧', desc: 'Fine-tune setup and try different compounds' },
  qualifying: { title: 'Qualifying', icon: '⏱️', desc: 'One-lap shootout — find the ultimate pace' },
  race: { title: 'Race', icon: '🏁', desc: 'Full race simulation with strategy decisions' },
  debrief: { title: 'Post-Race Debrief', icon: '📊', desc: 'Review performance and learn from the weekend' },
};

const SESSION_ORDER: Session[] = ['briefing', 'fp1', 'fp2', 'qualifying', 'race', 'debrief'];

export default function RaceWeekend() {
  const { dispatch } = useApp();
  const [trackId, setTrackId] = useState('silverstone');
  const [session, setSession] = useState<Session>('briefing');
  const [setup, setSetup] = useState<CarSetup>(() => defaultSetup('silverstone'));
  const [lapLog, setLapLog] = useState<LapRecord[]>([]);
  const [compound, setCompound] = useState<TireCompound>('medium');
  const [xpPopup, setXpPopup] = useState<number | null>(null);
  const [raceResult, setRaceResult] = useState<{ position: number; totalTime: number; laps: number } | null>(null);
  const [qualTime, setQualTime] = useState<number | null>(null);

  const track = getTrack(trackId);
  const sessionIdx = SESSION_ORDER.indexOf(session);

  const runLap = useCallback((sessionName: string, comp: TireCompound) => {
    const modifiedSetup = { ...setup };
    const result = simulateLap(modifiedSetup, track);
    const compDelta = COMPOUND_DELTA[comp];
    const lapTime = round(result.totalTime + compDelta + (Math.random() - 0.5) * 0.3, 3);

    setLapLog(prev => [...prev, {
      session: sessionName,
      lapTime,
      compound: comp,
      notes: result.feedback[0] || '',
    }]);

    dispatch({ type: 'RUN_SIMULATION', roleId: 'race-engineer' });
    return lapTime;
  }, [setup, track, dispatch]);

  const advanceSession = useCallback(() => {
    const nextIdx = sessionIdx + 1;
    if (nextIdx < SESSION_ORDER.length) {
      setSession(SESSION_ORDER[nextIdx]);

      if (SESSION_ORDER[nextIdx] === 'debrief') {
        dispatch({ type: 'ADD_XP', amount: 100 });
        setXpPopup(100);
      }
    }
  }, [sessionIdx, dispatch]);

  const runFP = useCallback(() => {
    const sessionName = session === 'fp1' ? 'FP1' : 'FP2';
    // Run 3 laps on selected compound
    const laps: number[] = [];
    for (let i = 0; i < 3; i++) {
      laps.push(runLap(sessionName, compound));
    }
    dispatch({ type: 'ADD_XP', amount: XP_REWARDS.SIMULATION_RUN });
    setXpPopup(XP_REWARDS.SIMULATION_RUN);
  }, [session, compound, runLap, dispatch]);

  const runQualifying = useCallback(() => {
    // Q1, Q2, Q3 - one lap each on softs
    const q1 = runLap('Q1', 'soft');
    const q2 = runLap('Q2', 'soft');
    const q3 = runLap('Q3', 'soft');
    const best = Math.min(q1, q2, q3);
    setQualTime(best);

    // Grid position based on how close to reference
    dispatch({ type: 'ADD_XP', amount: XP_REWARDS.SIMULATION_RUN * 2 });
    setXpPopup(XP_REWARDS.SIMULATION_RUN * 2);
  }, [runLap, dispatch]);

  const runRace = useCallback(() => {
    const raceLaps = 15; // shortened race
    let totalTime = 0;
    const pitLap = 8;
    let currentCompound: TireCompound = compound;

    for (let lap = 0; lap < raceLaps; lap++) {
      const stintLap = lap < pitLap ? lap : lap - pitLap;
      const deg = tireDegradation(stintLap, currentCompound);
      const lapTime = runLap('Race', currentCompound) + deg;
      totalTime += lapTime;

      if (lap === pitLap - 1) {
        totalTime += pitStopLoss();
        currentCompound = currentCompound === 'soft' ? 'hard' : 'medium';
      }
    }

    // AI positions (relative to reference)
    const refRaceTime = track.referenceTime * raceLaps + pitStopLoss() + 15; // AI total
    const position = totalTime < refRaceTime - 5 ? 1 : totalTime < refRaceTime ? Math.floor(Math.random() * 3) + 2 : Math.floor(Math.random() * 8) + 4;

    setRaceResult({ position, totalTime: round(totalTime, 1), laps: raceLaps });
    dispatch({ type: 'ADD_XP', amount: position <= 3 ? 80 : 40 });
    setXpPopup(position <= 3 ? 80 : 40);
  }, [compound, runLap, track, dispatch]);

  const quickSetupChange = useCallback((preset: 'low-df' | 'balanced' | 'high-df') => {
    const presets: Record<string, Partial<CarSetup>> = {
      'low-df': { frontWingAngle: 4, rearWingAngle: 6, suspensionStiffness: 40 },
      'balanced': { frontWingAngle: 8, rearWingAngle: 12, suspensionStiffness: 50 },
      'high-df': { frontWingAngle: 12, rearWingAngle: 20, suspensionStiffness: 60 },
    };
    setSetup(s => ({ ...s, ...presets[preset] }));
  }, []);

  const bestLap = lapLog.length > 0 ? Math.min(...lapLog.map(l => l.lapTime)) : null;
  const fpLaps = lapLog.filter(l => l.session.startsWith('FP'));
  const qualLaps = lapLog.filter(l => l.session.startsWith('Q'));

  return (
    <div className="p-6">
      {xpPopup && <XPPopup amount={xpPopup} onDone={() => setXpPopup(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-white">🏁 Race Weekend</h2>
          <p className="text-slate-400 text-sm">Experience a full F1 race weekend — practice, qualifying, and race</p>
        </div>
        <select
          value={trackId}
          onChange={e => { setTrackId(e.target.value); setSession('briefing'); setLapLog([]); setRaceResult(null); setQualTime(null); }}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
          disabled={session !== 'briefing'}
        >
          {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* Session Progress */}
      <div className="bg-racing-panel border border-racing-border rounded-xl p-4 mb-6">
        <div className="flex gap-1">
          {SESSION_ORDER.map((s, i) => {
            const info = SESSION_INFO[s];
            const isActive = s === session;
            const isDone = i < sessionIdx;
            return (
              <div
                key={s}
                className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
                  isActive ? 'bg-xp-bar text-white' : isDone ? 'bg-accent-green/20 text-accent-green' : 'bg-slate-800 text-slate-500'
                }`}
              >
                <div>{info.icon}</div>
                <div className="mt-0.5 hidden md:block">{info.title.split(' ').slice(0, 2).join(' ')}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Session Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* BRIEFING */}
          {session === 'briefing' && (
            <div className="bg-racing-panel border border-racing-border rounded-xl p-6 slide-in">
              <h3 className="text-xl font-bold text-white mb-4">📋 Pre-Race Briefing: {track.name}</h3>
              <div className="space-y-4 text-sm text-slate-300">
                <div className="bg-slate-900 rounded-lg p-4">
                  <h4 className="text-accent-cyan font-bold mb-2">Track Info</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Country: <span className="text-white">{track.country}</span></div>
                    <div>Length: <span className="text-white">{track.lengthKm} km</span></div>
                    <div>Sectors: <span className="text-white">{track.sectors.length}</span></div>
                    <div>Ref Time: <span className="text-white">{track.referenceTime}s</span></div>
                  </div>
                </div>
                <div className="bg-slate-900 rounded-lg p-4">
                  <h4 className="text-accent-amber font-bold mb-2">Track Character</h4>
                  {(() => {
                    const straights = track.sectors.filter(s => s.type === 'straight').length;
                    const slowCorners = track.sectors.filter(s => s.type === 'slow-corner').length;
                    const fastCorners = track.sectors.filter(s => s.type === 'fast-corner').length;
                    return (
                      <>
                        <p>{straights} straights, {slowCorners} slow corners, {fastCorners} fast corners</p>
                        <p className="mt-1">
                          {slowCorners > 4 ? 'High downforce track — prioritise cornering grip over top speed' :
                           fastCorners > 3 ? 'Flowing circuit — balanced setup needed for fast sweeping corners' :
                           'Low downforce track — trim the wings for maximum straight-line speed'}
                        </p>
                      </>
                    );
                  })()}
                </div>
                <div className="bg-slate-900 rounded-lg p-4">
                  <h4 className="text-accent-green font-bold mb-2">Weekend Plan</h4>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400">
                    <li><span className="text-white">FP1:</span> Run a baseline setup, understand the car</li>
                    <li><span className="text-white">FP2:</span> Fine-tune and try different tire compounds</li>
                    <li><span className="text-white">Qualifying:</span> Push for the best one-lap time on soft tires</li>
                    <li><span className="text-white">Race:</span> Manage tires and strategy over 15 laps</li>
                  </ol>
                </div>
                <p className="text-xs text-slate-500">
                  This is exactly what real F1 engineers do — they arrive at a new circuit on Thursday, study the track, and plan their approach for the whole weekend.
                </p>
              </div>
              <button onClick={advanceSession} className="mt-4 w-full py-3 bg-xp-bar text-white rounded-xl font-bold text-sm hover:bg-xp-bar/80 transition-colors">
                Start FP1 →
              </button>
            </div>
          )}

          {/* FREE PRACTICE */}
          {(session === 'fp1' || session === 'fp2') && (
            <div className="space-y-4 slide-in">
              <div className="bg-racing-panel border border-racing-border rounded-xl p-5">
                <h3 className="text-xl font-bold text-white mb-2">
                  {SESSION_INFO[session].icon} {SESSION_INFO[session].title}
                </h3>
                <p className="text-slate-400 text-sm mb-4">{SESSION_INFO[session].desc}</p>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button onClick={() => quickSetupChange('low-df')} className="py-2 bg-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors">Low Downforce</button>
                  <button onClick={() => quickSetupChange('balanced')} className="py-2 bg-xp-bar/20 rounded-lg text-sm text-xp-bar font-bold hover:bg-xp-bar/30 transition-colors">Balanced</button>
                  <button onClick={() => quickSetupChange('high-df')} className="py-2 bg-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors">High Downforce</button>
                </div>

                <div className="flex gap-2 mb-4">
                  <span className="text-sm text-slate-300">Tire:</span>
                  {(['soft', 'medium', 'hard'] as TireCompound[]).map(c => (
                    <button key={c} onClick={() => setCompound(c)}
                      className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${compound === c ? 'ring-2 ring-white' : 'opacity-60'}`}
                      style={{ backgroundColor: COMPOUND_COLORS[c], color: c === 'hard' ? '#000' : '#fff' }}
                    >{c}</button>
                  ))}
                </div>

                <button onClick={runFP} className="w-full py-3 bg-racing-red text-white rounded-xl font-black text-sm hover:bg-racing-red/80 transition-colors">
                  🏎️ Run 3-Lap Stint
                </button>
              </div>

              {fpLaps.length > 0 && (
                <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
                  <h4 className="text-white font-bold mb-2">Practice Log</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {fpLaps.map((lap, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm bg-slate-900 rounded px-3 py-1.5">
                        <span className="text-slate-500 w-8">{lap.session}</span>
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COMPOUND_COLORS[lap.compound] }} />
                        <span className="font-mono text-white">{lap.lapTime.toFixed(3)}s</span>
                        <span className="text-slate-500 text-xs ml-auto truncate max-w-40">{lap.notes}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={advanceSession} className="w-full py-2.5 bg-slate-700 text-white rounded-xl font-semibold text-sm hover:bg-slate-600 transition-colors">
                Move to {SESSION_INFO[SESSION_ORDER[sessionIdx + 1]].title} →
              </button>
            </div>
          )}

          {/* QUALIFYING */}
          {session === 'qualifying' && (
            <div className="space-y-4 slide-in">
              <div className="bg-racing-panel border border-racing-border rounded-xl p-5">
                <h3 className="text-xl font-bold text-white mb-2">⏱️ Qualifying</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Three rounds of qualifying (Q1, Q2, Q3). Each is a single flying lap on soft tires. Your best time sets your grid position.
                </p>

                <div className="bg-slate-900 rounded-lg p-4 mb-4">
                  <h4 className="text-accent-cyan font-bold text-sm mb-2">How F1 Qualifying Works</h4>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p><span className="text-white font-bold">Q1 (18 min):</span> All 20 cars. Bottom 5 are eliminated.</p>
                    <p><span className="text-white font-bold">Q2 (15 min):</span> Top 15 cars. Bottom 5 eliminated.</p>
                    <p><span className="text-white font-bold">Q3 (12 min):</span> Top 10 shootout for pole position!</p>
                  </div>
                </div>

                {!qualTime ? (
                  <button onClick={runQualifying} className="w-full py-3 bg-racing-red text-white rounded-xl font-black text-sm hover:bg-racing-red/80 transition-colors">
                    ⏱️ START QUALIFYING
                  </button>
                ) : (
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-1">Your Best Qualifying Time</div>
                    <div className="text-3xl font-mono font-black text-white mb-2">{qualTime.toFixed(3)}s</div>
                    <div className={`text-sm font-bold ${qualTime < track.referenceTime ? 'text-accent-green' : 'text-accent-amber'}`}>
                      {qualTime < track.referenceTime ? `P1! ${round(track.referenceTime - qualTime, 3)}s faster than reference!` :
                       qualTime < track.referenceTime + 1 ? 'Front row start!' :
                       qualTime < track.referenceTime + 3 ? 'Top 5 start' : 'Midfield start'}
                    </div>
                    {qualLaps.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {qualLaps.map((l, i) => (
                          <div key={i} className="flex justify-center gap-4 text-sm">
                            <span className="text-slate-500">{l.session}</span>
                            <span className="font-mono text-white">{l.lapTime.toFixed(3)}s</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {qualTime && (
                <button onClick={advanceSession} className="w-full py-2.5 bg-accent-green text-slate-900 rounded-xl font-bold text-sm hover:bg-accent-green/80 transition-colors">
                  Race Day! →
                </button>
              )}
            </div>
          )}

          {/* RACE */}
          {session === 'race' && (
            <div className="space-y-4 slide-in">
              <div className="bg-racing-panel border border-racing-border rounded-xl p-5">
                <h3 className="text-xl font-bold text-white mb-2">🏁 Race — {track.name}</h3>
                <p className="text-slate-400 text-sm mb-4">
                  15-lap race with one mandatory pit stop. Choose your starting compound wisely.
                </p>

                {!raceResult ? (
                  <>
                    <div className="bg-slate-900 rounded-lg p-4 mb-4">
                      <h4 className="text-white font-bold text-sm mb-2">Starting Tire</h4>
                      <div className="flex gap-2 mb-3">
                        {(['soft', 'medium', 'hard'] as TireCompound[]).map(c => (
                          <button key={c} onClick={() => setCompound(c)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize ${compound === c ? 'ring-2 ring-white' : 'opacity-60'}`}
                            style={{ backgroundColor: COMPOUND_COLORS[c], color: c === 'hard' ? '#000' : '#fff' }}
                          >{c}</button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">
                        {compound === 'soft' ? 'Fast start but you\'ll need to pit early (around lap 6-8)' :
                         compound === 'medium' ? 'Good balance — pit around lap 8-10' :
                         'Slow start but can go long — pit late for fresh softs at the end'}
                      </p>
                    </div>
                    <button onClick={runRace} className="w-full py-3 bg-racing-red text-white rounded-xl font-black text-sm hover:bg-racing-red/80">
                      🏁 LIGHTS OUT AND AWAY WE GO!
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="text-6xl mb-3">
                      {raceResult.position === 1 ? '🥇' : raceResult.position === 2 ? '🥈' : raceResult.position === 3 ? '🥉' : '🏎️'}
                    </div>
                    <div className="text-3xl font-black text-white mb-1">P{raceResult.position}</div>
                    <div className="text-sm text-slate-400 mb-3">
                      {raceResult.laps} laps — Total: {Math.floor(raceResult.totalTime / 60)}:{(raceResult.totalTime % 60).toFixed(1).padStart(4, '0')}
                    </div>
                    {raceResult.position <= 3 && (
                      <div className="text-accent-green font-bold">Podium finish! Incredible race!</div>
                    )}
                  </div>
                )}
              </div>

              {raceResult && (
                <button onClick={advanceSession} className="w-full py-2.5 bg-xp-bar text-white rounded-xl font-bold text-sm hover:bg-xp-bar/80 transition-colors">
                  Post-Race Debrief →
                </button>
              )}
            </div>
          )}

          {/* DEBRIEF */}
          {session === 'debrief' && (
            <div className="space-y-4 slide-in">
              <div className="bg-racing-panel border border-racing-border rounded-xl p-5">
                <h3 className="text-xl font-bold text-white mb-4">📊 Post-Race Debrief</h3>
                <p className="text-slate-300 text-sm mb-4">
                  After every race, the engineering team reviews all data to understand what worked and what didn't. This is how F1 teams improve week by week.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-slate-900 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-500">Best Lap</div>
                    <div className="text-lg font-mono font-bold text-accent-green">{bestLap?.toFixed(3)}s</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-500">Total Laps</div>
                    <div className="text-lg font-mono font-bold text-white">{lapLog.length}</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-500">Qualifying</div>
                    <div className="text-lg font-mono font-bold text-accent-cyan">{qualTime?.toFixed(3)}s</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-500">Race Result</div>
                    <div className="text-lg font-mono font-bold text-accent-amber">P{raceResult?.position || '?'}</div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 mb-4">
                  <h4 className="text-accent-cyan font-bold text-sm mb-2">Key Takeaways</h4>
                  <div className="space-y-2 text-sm text-slate-400">
                    <p>▸ You completed a full race weekend simulation — this is the real workflow of an F1 engineer.</p>
                    <p>▸ Real teams use thousands of data channels and hundreds of simulations to find the optimal setup.</p>
                    <p>▸ The difference between pole and P10 is often less than 1 second — precision matters!</p>
                    {raceResult && raceResult.position <= 3 && (
                      <p className="text-accent-green">▸ Amazing podium! Your setup and strategy decisions paid off.</p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900 rounded-lg p-4">
                  <h4 className="text-accent-amber font-bold text-sm mb-2">What Real Engineers Do Next</h4>
                  <div className="space-y-1 text-sm text-slate-400">
                    <p>1. Review all telemetry data lap by lap</p>
                    <p>2. Compare actual performance to simulator predictions</p>
                    <p>3. Identify setup changes for the next race</p>
                    <p>4. Debrief with the driver about car behaviour</p>
                    <p>5. Feed learnings into the car development programme</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => { setSession('briefing'); setLapLog([]); setRaceResult(null); setQualTime(null); }}
                className="w-full py-2.5 bg-racing-red text-white rounded-xl font-bold text-sm hover:bg-racing-red/80 transition-colors"
              >
                🔄 Start New Race Weekend
              </button>
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Weekend Stats */}
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">Weekend Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Track</span>
                <span className="text-white">{track.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Laps Run</span>
                <span className="text-white">{lapLog.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Best Lap</span>
                <span className="text-accent-green font-mono">{bestLap?.toFixed(3) || '—'}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ref Time</span>
                <span className="text-slate-300 font-mono">{track.referenceTime}s</span>
              </div>
              {qualTime && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Qual Time</span>
                  <span className="text-accent-cyan font-mono">{qualTime.toFixed(3)}s</span>
                </div>
              )}
              {raceResult && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Race Finish</span>
                  <span className="text-accent-amber font-bold">P{raceResult.position}</span>
                </div>
              )}
            </div>
          </div>

          {/* Current Setup */}
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">Current Setup</h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Front Wing</span><span className="text-white font-mono">{setup.frontWingAngle}°</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Rear Wing</span><span className="text-white font-mono">{setup.rearWingAngle}°</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Suspension</span><span className="text-white font-mono">{setup.suspensionStiffness}%</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Brake Bal.</span><span className="text-white font-mono">{setup.brakeBalance}%</span>
              </div>
            </div>
          </div>

          {/* Engineer Tips */}
          <div className="bg-racing-panel border border-racing-border rounded-xl p-4">
            <h3 className="text-white font-bold mb-2">💡 Engineer Tips</h3>
            <div className="text-xs text-slate-400 space-y-2">
              {session === 'briefing' && <p>Study the track characteristics carefully. The number of slow vs fast corners determines whether you need high or low downforce.</p>}
              {session === 'fp1' && <p>FP1 is about understanding. Don't chase lap times — try different setups and see how the car responds. Use medium tires to save softs.</p>}
              {session === 'fp2' && <p>Now fine-tune! Try all three compounds to understand the tire window. Your race strategy depends on knowing the pace of each compound.</p>}
              {session === 'qualifying' && <p>Qualifying is all about one perfect lap. Soft tires, low fuel, maximum attack. This is where the car and driver must both be at their best.</p>}
              {session === 'race' && <p>Race pace is different from qualifying pace. Manage your tires, plan your pit stop, and think about the long game — not just the next corner.</p>}
              {session === 'debrief' && <p>The best engineers learn more from mistakes than successes. What would you change if you could do this weekend again?</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
