import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts";

const AXES = [
  { key: "fit", label: "Fit" },
  { key: "market_demand", label: "Demand" },
  { key: "salary_potential", label: "Salary" },
  { key: "transition_speed", label: "Speed" },
  { key: "stability", label: "Stability" }
];

const PATH_COLORS = ["#4F46E5", "#10b981", "#f59e0b"];

function safeScore(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 5;
}

function buildChartData(paths) {
  return AXES.map(({ key, label }) => {
    const entry = { axis: label };
    paths.forEach((path, i) => {
      entry[`path_${i}`] = safeScore(path.radar_scores?.[key]);
    });
    return entry;
  });
}

export default function PathRadarChart({ paths }) {
  const validPaths = paths.filter((p) => p.radar_scores);
  if (validPaths.length === 0) return null;

  const data = buildChartData(validPaths);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
        Path comparison
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }}
          />
          <Tooltip
            formatter={(value, name) => {
              const index = Number(name.split("_")[1]);
              return [`${value}/10`, validPaths[index]?.title || name];
            }}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              fontSize: "12px"
            }}
          />
          {validPaths.map((path, i) => (
            <Radar
              key={path.id}
              name={`path_${i}`}
              dataKey={`path_${i}`}
              stroke={PATH_COLORS[i]}
              fill={PATH_COLORS[i]}
              fillOpacity={0.12}
              strokeWidth={2}
            />
          ))}
          <Legend
            formatter={(value) => {
              const index = Number(value.split("_")[1]);
              return (
                <span style={{ fontSize: "12px", color: "#475569" }}>
                  {validPaths[index]?.title || value}
                </span>
              );
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div className="mt-3 grid grid-cols-5 gap-1 text-center text-[10px] uppercase tracking-[0.14em] text-slate-400">
        <span>Fit = profile match</span>
        <span>Demand = hiring signal</span>
        <span>Salary = earning ceiling</span>
        <span>Speed = time to land</span>
        <span>Stability = inverse risk</span>
      </div>
    </div>
  );
}
