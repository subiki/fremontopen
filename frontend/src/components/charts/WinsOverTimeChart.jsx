import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const WinsOverTimeChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-[#6B7280] text-sm">Not enough match history to chart.</div>
    );
  }
  const fmt = (d) => {
    try {
      return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return d;
    }
  };
  return (
    <div className="h-64 w-full" data-testid="wins-over-time-chart">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#273041" strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={fmt} stroke="#6B7280" tick={{ fontSize: 11 }} />
          <YAxis stroke="#6B7280" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#141923",
              border: "1px solid #273041",
              borderRadius: 6,
              fontSize: 12,
              color: "#F3F4F6",
            }}
            labelFormatter={fmt}
          />
          <Line type="monotone" dataKey="wins" stroke="#10B981" strokeWidth={2} dot={false} name="Cumulative wins" />
          <Line type="monotone" dataKey="losses" stroke="#EF4444" strokeWidth={2} dot={false} name="Cumulative losses" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
