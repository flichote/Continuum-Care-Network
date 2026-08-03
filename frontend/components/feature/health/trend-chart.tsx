"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { METRIC_DEFS, REFERENCE_RANGES } from "@/lib/constants";
import type { TrendOut } from "@/types";

interface TrendChartProps {
  trend: TrendOut;
  days: number;
  onDaysChange: (days: number) => void;
}

interface ChartDatum {
  date: string;
  [key: string]: number | string | undefined;
}

/**
 * 后端 /health/trends 对血压会按字段（systolic,diastolic）各输出一个点，
 * 这里按出现顺序拆分为两条序列合并展示。
 */
function buildData(trend: TrendOut): ChartDatum[] {
  if (trend.record_type === "blood_pressure") {
    const map = new Map<string, ChartDatum>();
    const keys = ["systolic", "diastolic"];
    trend.points.forEach((p, i) => {
      const field = keys[i % 2];
      const entry = map.get(p.date) ?? { date: p.date };
      entry[field] = p.avg ?? p.max ?? p.min ?? 0;
      map.set(p.date, entry);
    });
    return Array.from(map.values());
  }
  return trend.points.map((p) => ({
    date: p.date,
    value: p.avg ?? p.max ?? p.min ?? 0,
  }));
}

export function TrendChart({ trend, days, onDaysChange }: TrendChartProps) {
  const data = useMemo(() => buildData(trend), [trend]);
  const def = METRIC_DEFS[trend.record_type as keyof typeof METRIC_DEFS];
  const isBp = trend.record_type === "blood_pressure";
  const range = isBp ? undefined : REFERENCE_RANGES[trend.record_type];

  if (!def) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: def.color }} />
          <span className="font-medium text-neutral-700">{def.label}</span>
          <span className="text-neutral-400">({def.unit})</span>
        </div>
        <div className="flex gap-1 rounded-sm bg-neutral-100 p-0.5 text-xs">
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => onDaysChange(d)}
              className={`rounded-sm px-2.5 py-1 transition-colors ${
                days === d ? "bg-white font-medium text-primary-700 shadow-sm" : "text-neutral-500"
              }`}
            >
              {d} 天
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-neutral-200 text-sm text-neutral-400">
          暂无数据，去上报
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="#F1F5F9" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#94A3B8" }}
                tickLine={false}
                axisLine={{ stroke: "#E2E8F0" }}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 12, fill: "#94A3B8" }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 6,
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 10px 15px -3px rgba(15,23,42,0.1)",
                  fontSize: 12,
                }}
                formatter={(value, name) => [
                  `${value} ${def.unit}`,
                  name === "systolic" ? "收缩压" : name === "diastolic" ? "舒张压" : def.label,
                ]}
              />
              {range?.min !== undefined && range?.max !== undefined && (
                <ReferenceArea y1={range.min} y2={range.max} fill="#D6F5EC" fillOpacity={0.35} />
              )}
              {isBp ? (
                <>
                  <Line
                    type="monotone"
                    dataKey="systolic"
                    stroke="#0D9488"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#0D9488" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="diastolic"
                    stroke="#14B8A6"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#14B8A6" }}
                    activeDot={{ r: 5 }}
                  />
                  <Legend
                    formatter={(value: string) =>
                      value === "systolic" ? "收缩压" : "舒张压"
                    }
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </>
              ) : (
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={def.color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: def.color }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
