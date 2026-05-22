import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatTimelineAxisDate, formatTimelineTooltipDate } from "../../lib/timelineDates";

export const EloRatingChart = ({ data }) => {
  if (!data || data.length < 2) {
    return (
      <div className="text-[#6B7280] text-sm">Not enough rated match history to chart.</div>
    );
  }

  const values = data.map((row) => row.rating_after).filter((value) => typeof value === "number");
  const min = Math.max(0, Math.min(...values) - 30);
  const max = Math.max(...values) + 30;

  return (
    <div className="h-64 w-full" data-testid="elo-rating-chart">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#273041" strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatTimelineAxisDate} stroke="#6B7280" tick={{ fontSize: 11 }} />
          <YAxis domain={[min, max]} stroke="#6B7280" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#141923",
              border: "1px solid #273041",
              borderRadius: 6,
              fontSize: 12,
              color: "#F3F4F6",
            }}
            labelFormatter={formatTimelineTooltipDate}
            formatter={(value, name, row) => [
              `${value} (${row.payload.delta > 0 ? "+" : ""}${row.payload.delta})`,
              name,
            ]}
          />
          <Line type="monotone" dataKey="rating_after" stroke="#F59E0B" strokeWidth={2} dot={false} name="ELO" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
