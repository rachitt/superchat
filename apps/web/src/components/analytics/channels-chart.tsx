"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { channelId: string; name: string; count: number }[];
}

export function ChannelsChart({ data }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Top Channels</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="count"
              fill="var(--color-primary)"
              radius={[0, 4, 4, 0]}
              name="Messages"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
