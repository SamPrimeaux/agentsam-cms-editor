import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { day: string; runs?: number; daily_cost?: number };

type Props = {
  data: Point[];
  dataKey: "runs" | "daily_cost";
  stroke?: string;
};

/** Portable chart — uses CSS var for stroke default */
export function ActivityLineChart({
  data,
  dataKey,
  stroke = "var(--solar-cyan)",
}: Props) {
  if (!data.length) {
    return <p className="muted">No activity in window.</p>;
  }
  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--dashboard-border)" strokeDasharray="3 3" />
          <XAxis dataKey="day" tick={{ fill: "var(--dashboard-muted)", fontSize: 10 }} />
          <YAxis tick={{ fill: "var(--dashboard-muted)", fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              background: "var(--dashboard-panel-elevated)",
              border: "1px solid var(--dashboard-border)",
              borderRadius: 8,
            }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
