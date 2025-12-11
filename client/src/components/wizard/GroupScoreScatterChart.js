// src/components/wizard/GroupScoreScatterChart.js
// ⚠️ 이름은 그대로 두지만, 이제 "정규분포 + 커트라인/평균" 그래프를 그림.
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { COLORS } from "../../utils/step6StyleConfig";

// summaryStats 기반으로 정규분포 곡선 샘플 생성
function buildNormalCurve(summaryStats) {
  if (!summaryStats) return [];

  const { minTotal, maxTotal, avgTotal, stdTotal } = summaryStats;

  if (
    typeof avgTotal !== "number" ||
    typeof stdTotal !== "number" ||
    Number.isNaN(avgTotal) ||
    Number.isNaN(stdTotal) ||
    stdTotal <= 0
  ) {
    return [];
  }

  const xMin =
    typeof minTotal === "number" && !Number.isNaN(minTotal)
      ? minTotal
      : avgTotal - 3 * stdTotal;
  const xMax =
    typeof maxTotal === "number" && !Number.isNaN(maxTotal)
      ? maxTotal
      : avgTotal + 3 * stdTotal;

  if (xMax <= xMin) return [];

  const steps = 80; // 점 몇 개 그릴지
  const twoPi = Math.sqrt(2 * Math.PI);
  const points = [];

  for (let i = 0; i <= steps; i++) {
    const x = xMin + ((xMax - xMin) * i) / steps;
    const z = (x - avgTotal) / stdTotal;
    const pdf = Math.exp(-0.5 * z * z) / (stdTotal * twoPi);
    points.push({ x, pdf });
  }

  // y값을 0~1로 정규화 (모양만 쓰는 거라 크기는 의미 없음)
  const maxPdf = Math.max(...points.map((p) => p.pdf));
  return points.map((p) => ({
    x: p.x,
    y: maxPdf > 0 ? p.pdf / maxPdf : 0,
  }));
}

function NormalTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;

  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #ccc",
        borderRadius: 4,
        padding: "6px 8px",
        fontSize: 11,
      }}
    >
      <div>
        <strong>점수</strong>: {d.x?.toFixed(2)}
      </div>
      <div>
        <strong>상대적 밀도</strong>: {d.y?.toFixed(2)}
      </div>
      <div style={{ marginTop: 4, color: "#666" }}>
        (정규분포 모양만 보는 용도입니다)
      </div>
    </div>
  );
}

/**
 * props
 * - groupName: string (안 써도 형식 유지용)
 * - points: [{ totalScore, phaseRole, ... }]  // 지금은 곡선 모양 여부 판단에만 사용 가능, 실제 계산은 summaryStats 기반
 * - summaryStats: { minTotal, maxTotal, avgTotal, stdTotal, cutoff, ... }
 * - chartWidthScale, chartHeight, showCartesianGrid, showLegend
 */
export default function GroupScoreScatterChart({
  groupName, // eslint-disable-line no-unused-vars
  points,
  summaryStats,
  chartWidthScale,
  chartHeight,
  showCartesianGrid,
  showLegend,
}) {
  // 데이터가 아예 없으면 렌더 안 함
  if (!summaryStats) {
    return (
      <div style={{ fontSize: 12, color: "#999" }}>
        표시할 데이터가 없습니다.
      </div>
    );
  }

  const data = buildNormalCurve(summaryStats);
  if (!data.length) {
    return (
      <div style={{ fontSize: 12, color: "#999" }}>
        정규분포를 추정할 수 있는 데이터가 없습니다.
      </div>
    );
  }

  const { minTotal, maxTotal, cutoff, avgTotal } = summaryStats;

  const domainMin =
    typeof minTotal === "number" && !Number.isNaN(minTotal)
      ? Math.floor(minTotal)
      : "auto";
  const domainMax =
    typeof maxTotal === "number" && !Number.isNaN(maxTotal)
      ? Math.ceil(maxTotal)
      : "auto";

  const hasAvg =
    typeof avgTotal === "number" && !Number.isNaN(avgTotal);
  const hasCutoff =
    typeof cutoff === "number" && !Number.isNaN(cutoff);

  return (
    <div
      style={{
        width: `${chartWidthScale}%`,
        maxWidth: "100%",
        height: chartHeight,
      }}
    >
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{
            top: 20,
            right: 20,
            left: 10,
            bottom: 20,
          }}
        >
          {showCartesianGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis
            type="number"
            dataKey="x"
            domain={[domainMin, domainMax]}
            tickFormatter={(v) =>
              typeof v === "number" ? v.toFixed(0) : v
            }
            label={{
              value: "총점",
              position: "insideBottom",
              offset: -5,
              fontSize: 11,
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            tickFormatter={(v) => v.toFixed(2)}
          />
          <Tooltip content={<NormalTooltip />} />
          {showLegend && <Legend />}

          {/* 커트라인 */}
          {hasCutoff && (
            <ReferenceLine
              x={cutoff}
              stroke={COLORS.secondary}
              strokeDasharray="4 4"
              label={{
                value: "커트라인",
                position: "top",
                fontSize: 11,
                fill: COLORS.secondary,
              }}
            />
          )}

          {/* 평균 */}
          {hasAvg && (
            <ReferenceLine
              x={avgTotal}
              stroke={COLORS.primary}
              strokeDasharray="4 4"
              label={{
                value: "평균",
                position: "top",
                fontSize: 11,
                fill: COLORS.primary,
              }}
            />
          )}

          {/* 정규분포 곡선 */}
          <Line
            type="monotone"
            dataKey="y"
            name="추정 정규분포"
            stroke={COLORS.muted}
            dot={false}
            strokeWidth={2}
          />

          {/* Legend에만 쓰는 더미 라인들 */}
          {hasAvg && (
            <Line
              type="monotone"
              dataKey="y"
              name="평균"
              stroke={COLORS.primary}
              strokeDasharray="4 4"
              strokeOpacity={0}
              dot={false}
              isAnimationActive={false}
            />
          )}
          {hasCutoff && (
            <Line
              type="monotone"
              dataKey="y"
              name="커트라인"
              stroke={COLORS.secondary}
              strokeDasharray="4 4"
              strokeOpacity={0}
              dot={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
