"use client";

import type { ChartData, ChartOptions } from "chart.js";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Bar, Doughnut, Line, Pie } from "react-chartjs-2";
import {
  Area,
  AreaChart,
  Bar as RechartsBar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend as RechartsLegend,
  Line as RechartsLine,
  LineChart,
  Pie as RechartsPie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from "recharts";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  annotationPlugin
);

export function ChartJsLineChart({
  data,
  options,
  height = 240
}: {
  data: ChartData<"line">;
  options?: ChartOptions<"line">;
  height?: number;
}) {
  return <Line data={data} options={options} height={height} />;
}

export function ChartJsBarChart({
  data,
  options,
  height = 240
}: {
  data: ChartData<"bar">;
  options?: ChartOptions<"bar">;
  height?: number;
}) {
  return <Bar data={data} options={options} height={height} />;
}

export function ChartJsPieChart({
  data,
  options,
  height = 240
}: {
  data: ChartData<"pie">;
  options?: ChartOptions<"pie">;
  height?: number;
}) {
  return <Pie data={data} options={options} height={height} />;
}

export function ChartJsDoughnutChart({
  data,
  options,
  height = 240
}: {
  data: ChartData<"doughnut">;
  options?: ChartOptions<"doughnut">;
  height?: number;
}) {
  return <Doughnut data={data} options={options} height={height} />;
}

export type RechartsDatum = {
  name: string;
  value: number;
};

const rechartsPalette = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(var(--warning))"
];

export function RechartsLineChart({
  data,
  height = 260
}: {
  data: RechartsDatum[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        <RechartsTooltip />
        <RechartsLegend />
        <RechartsLine type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RechartsBarChart({
  data,
  height = 260
}: {
  data: RechartsDatum[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        <RechartsTooltip />
        <RechartsLegend />
        <RechartsBar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RechartsAreaChart({
  data,
  height = 260
}: {
  data: RechartsDatum[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        <RechartsTooltip />
        <RechartsLegend />
        <Area
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary) / 0.25)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RechartsPieChart({
  data,
  height = 260
}: {
  data: RechartsDatum[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <RechartsTooltip />
        <RechartsLegend />
        <RechartsPie data={data} dataKey="value" nameKey="name" outerRadius={90}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={rechartsPalette[index % rechartsPalette.length]} />
          ))}
        </RechartsPie>
      </PieChart>
    </ResponsiveContainer>
  );
}
