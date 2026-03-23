import { useState } from 'react';
import type { Challenge } from '../../types';

interface QuizModalProps {
  challenge: Challenge;
  onAnswer: (correct: boolean) => void;
  onClose: () => void;
}

export default function QuizModal({ challenge, onAnswer, onClose }: QuizModalProps) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const diffColors = {
    rookie: 'text-accent-green',
    intermediate: 'text-accent-amber',
    advanced: 'text-racing-red',
    expert: 'text-xp-bar',
  };

  function handleSubmit() {
    const correct = challenge.options
      ? answer === challenge.correctAnswer
      : answer.trim().toLowerCase() === challenge.correctAnswer.toLowerCase();
    setIsCorrect(correct);
    setSubmitted(true);
  }

  function handleDone() {
    onAnswer(isCorrect);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-racing-panel border border-racing-border rounded-xl max-w-xl w-full p-6 slide-in max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className={`text-xs font-bold uppercase ${diffColors[challenge.difficulty]}`}>
              {challenge.difficulty}
            </span>
            <h3 className="text-lg font-bold text-white mt-1">{challenge.title}</h3>
          </div>
          <span className="text-xp-bar font-bold text-sm">+{challenge.xpReward} XP</span>
        </div>

        <p className="text-slate-300 text-sm mb-4">{challenge.question}</p>

        {challenge.formula && (
          <div className="bg-slate-900 rounded-lg px-4 py-2 mb-4 font-mono text-accent-cyan text-center">
            {challenge.formula}
          </div>
        )}

        {!submitted ? (
          <>
            {challenge.options ? (
              <div className="space-y-2 mb-4">
                {challenge.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setAnswer(opt)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border transition-all text-sm ${
                      answer === opt
                        ? 'border-xp-bar bg-xp-bar/10 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white mb-4 outline-none focus:border-xp-bar transition-colors"
                onKeyDown={e => e.key === 'Enter' && answer && handleSubmit()}
                autoFocus
              />
            )}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors text-sm"
              >
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={!answer}
                className="flex-1 px-4 py-2 rounded-lg bg-xp-bar text-white font-semibold hover:bg-xp-bar/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Submit Answer
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={`rounded-lg p-4 mb-4 ${isCorrect ? 'bg-accent-green/10 border border-accent-green/30' : 'bg-racing-red/10 border border-racing-red/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{isCorrect ? '✅' : '❌'}</span>
                <span className={`font-bold ${isCorrect ? 'text-accent-green' : 'text-racing-red'}`}>
                  {isCorrect ? 'Correct!' : 'Not quite!'}
                </span>
              </div>
              {!isCorrect && (
                <p className="text-sm text-slate-300 mb-2">
                  The answer is: <span className="font-mono text-accent-cyan font-bold">{challenge.correctAnswer}</span>
                </p>
              )}
              <p className="text-sm text-slate-400">{challenge.explanation}</p>
            </div>
            <button
              onClick={handleDone}
              className="w-full px-4 py-2.5 rounded-lg bg-xp-bar text-white font-semibold hover:bg-xp-bar/90 transition-colors text-sm"
            >
              {isCorrect ? `Collect +${challenge.xpReward} XP` : 'Continue (+10 XP for trying)'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
