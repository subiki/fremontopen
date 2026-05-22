import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { formatTimelineAxisDate, formatTimelineTooltipDate } from "../../lib/timelineDates";

export const PlayerFormChart = ({ data }) => {
  if (!data || data.length < 2) {
    return (
      <div className="text-[#6B7280] text-sm">Not enough recent match history to chart.</div>
    );
  }

  return (
    <div className="h-64 w-full" data-testid="player-form-chart">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#273041" strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatTimelineAxisDate} stroke="#6B7280" tick={{ fontSize: 11 }} />
          <YAxis
            domain={[0, 100]}
            stroke="#6B7280"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              background: "#141923",
              border: "1px solid #273041",
              borderRadius: 6,
              fontSize: 12,
              color: "#F3F4F6",
            }}
            labelFormatter={formatTimelineTooltipDate}
            formatter={(value, name, row) => {
              const payload = row.payload || {};
              return [`${value}% (${payload.wins}-${payload.losses} last ${payload.window})`, name];
            }}
          />
          <ReferenceLine y={50} stroke="#6B7280" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="win_rate" stroke="#10B981" strokeWidth={2} dot={false} name="Form win rate" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
