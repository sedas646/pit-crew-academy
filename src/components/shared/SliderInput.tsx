interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  color?: string;
  onChange: (value: number) => void;
  hint?: string;
}

export default function SliderInput({
  label, value, min, max, step = 1, unit = '', color = '#8b5cf6', onChange, hint
}: SliderInputProps) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm text-slate-300 font-medium">{label}</label>
        <span className="text-sm font-mono font-bold" style={{ color }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, #334155 ${percent}%, #334155 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-slate-500 mt-0.5">
        <span>{min}{unit}</span>
        {hint && <span className="text-slate-400">{hint}</span>}
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
