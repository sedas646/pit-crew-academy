import type { ChartData } from '../../types';

interface ChartProps {
  datasets: ChartData[];
  width?: number;
  height?: number;
  xLabel?: string;
  yLabel?: string;
  showGrid?: boolean;
  xMax?: number;
  yMax?: number;
}

export default function Chart({
  datasets,
  width = 600,
  height = 300,
  xLabel = '',
  yLabel = '',
  showGrid = true,
  xMax: forceXMax,
  yMax: forceYMax,
}: ChartProps) {
  const padding = { top: 20, right: 20, bottom: 40, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Calculate ranges
  const allPoints = datasets.flatMap(d => d.points);
  if (allPoints.length === 0) return <div className="text-slate-500 text-sm">No data</div>;

  const xMin = 0;
  const xMax = forceXMax ?? Math.max(...allPoints.map(p => p.x));
  const yMin = 0;
  const yMax = forceYMax ?? Math.max(...allPoints.map(p => p.y)) * 1.1;

  const scaleX = (x: number) => padding.left + ((x - xMin) / (xMax - xMin)) * chartW;
  const scaleY = (y: number) => padding.top + chartH - ((y - yMin) / (yMax - yMin)) * chartH;

  // Grid lines
  const gridLinesX = 5;
  const gridLinesY = 5;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      style={{ maxHeight: height }}
    >
      {/* Background */}
      <rect x={padding.left} y={padding.top} width={chartW} height={chartH} fill="#0f172a" rx="4" />

      {/* Grid */}
      {showGrid && Array.from({ length: gridLinesY + 1 }, (_, i) => {
        const y = padding.top + (i / gridLinesY) * chartH;
        const val = yMax - (i / gridLinesY) * (yMax - yMin);
        return (
          <g key={`gy-${i}`}>
            <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={padding.left - 8} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end">
              {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val)}
            </text>
          </g>
        );
      })}
      {showGrid && Array.from({ length: gridLinesX + 1 }, (_, i) => {
        const x = padding.left + (i / gridLinesX) * chartW;
        const val = xMin + (i / gridLinesX) * (xMax - xMin);
        return (
          <g key={`gx-${i}`}>
            <line x1={x} y1={padding.top} x2={x} y2={padding.top + chartH} stroke="#1e293b" strokeWidth="1" />
            <text x={x} y={height - 8} fill="#64748b" fontSize="10" textAnchor="middle">
              {Math.round(val)}
            </text>
          </g>
        );
      })}

      {/* Data lines */}
      {datasets.map((dataset, di) => {
        if (dataset.points.length < 2) return null;
        const sorted = [...dataset.points].sort((a, b) => a.x - b.x);
        const pathD = sorted
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.y)}`)
          .join(' ');

        // Area fill
        const areaD = pathD +
          ` L ${scaleX(sorted[sorted.length - 1].x)} ${scaleY(0)}` +
          ` L ${scaleX(sorted[0].x)} ${scaleY(0)} Z`;

        return (
          <g key={di}>
            <path d={areaD} fill={dataset.color} opacity="0.1" />
            <path d={pathD} fill="none" stroke={dataset.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}

      {/* Axes */}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartH} stroke="#475569" strokeWidth="1.5" />
      <line x1={padding.left} y1={padding.top + chartH} x2={padding.left + chartW} y2={padding.top + chartH} stroke="#475569" strokeWidth="1.5" />

      {/* Labels */}
      {xLabel && (
        <text x={padding.left + chartW / 2} y={height - 2} fill="#94a3b8" fontSize="11" textAnchor="middle">{xLabel}</text>
      )}
      {yLabel && (
        <text x={12} y={padding.top + chartH / 2} fill="#94a3b8" fontSize="11" textAnchor="middle" transform={`rotate(-90 12 ${padding.top + chartH / 2})`}>{yLabel}</text>
      )}

      {/* Legend */}
      {datasets.length > 1 && datasets.map((d, i) => (
        <g key={`leg-${i}`} transform={`translate(${padding.left + 10 + i * 120}, ${padding.top + 12})`}>
          <rect width="12" height="3" fill={d.color} rx="1.5" />
          <text x="16" y="4" fill="#94a3b8" fontSize="10">{d.label}</text>
        </g>
      ))}
    </svg>
  );
}
