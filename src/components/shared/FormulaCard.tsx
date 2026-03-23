interface FormulaCardProps {
  title: string;
  formula: string;
  description: string;
  variables?: { symbol: string; meaning: string; value?: string }[];
  result?: string;
}

export default function FormulaCard({ title, formula, description, variables, result }: FormulaCardProps) {
  return (
    <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-accent-amber text-sm">📐</span>
        <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
      </div>
      <div className="bg-slate-900 rounded px-3 py-2 mb-2 font-mono text-center text-accent-cyan text-lg">
        {formula}
      </div>
      <p className="text-xs text-slate-400 mb-2">{description}</p>
      {variables && variables.length > 0 && (
        <div className="grid grid-cols-2 gap-1 text-xs mb-2">
          {variables.map(v => (
            <div key={v.symbol} className="flex gap-1">
              <span className="text-accent-cyan font-mono">{v.symbol}</span>
              <span className="text-slate-500">=</span>
              <span className="text-slate-400">{v.meaning}</span>
              {v.value && <span className="text-slate-300 font-mono ml-auto">{v.value}</span>}
            </div>
          ))}
        </div>
      )}
      {result && (
        <div className="bg-accent-green/10 border border-accent-green/30 rounded px-3 py-1.5 text-sm text-accent-green font-mono text-center">
          = {result}
        </div>
      )}
    </div>
  );
}
