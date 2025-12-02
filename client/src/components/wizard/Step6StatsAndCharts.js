import React, { useMemo, useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

const COLORS = {
  primary: "#1976d2",   // 합격: 파란색
  secondary: "#8b1a3d", // 불합격: 버건디색
  muted: "#90a4ae",     // 회청색 (보조용)
};

function isNumericLike(value) {
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  if (!s) return false;
  const num = Number(s.replace(/,/g, ""));
  return !Number.isNaN(num);
}

function toNumberOrNull(value) {
  if (!isNumericLike(value)) return null;
  return Number(String(value).replace(/,/g, ""));
}

// 클립보드로 "이미지 복사" 버튼
function CopyAsImageButton({ targetRef, label = "클립보드 복사" }) {
  const handleCopy = async () => {
    const node = targetRef?.current;
    if (!node) {
      alert("복사할 영역을 찾을 수 없습니다.");
      return;
    }
    try {
      const canvas = await html2canvas(node, { scale: 2 });
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) {
        alert("이미지 변환에 실패했습니다.");
        return;
      }

      const clipboard = navigator.clipboard;
      const ClipboardItemCtor = window.ClipboardItem;

      if (clipboard && clipboard.write && ClipboardItemCtor) {
        try {
          const item = new ClipboardItemCtor({ [blob.type]: blob });
          await clipboard.write([item]);
          alert("이미지 형태로 클립보드에 복사했습니다. (Ctrl+V로 붙여넣기)");
        } catch (err) {
          console.error(err);
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank");
        }
      } else {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }
    } catch (err) {
      console.error(err);
      alert("이미지 복사 중 오류가 발생했습니다.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        padding: "4px 10px",
        borderRadius: "999px",
        border: "1px solid #666",
        backgroundColor: "#fff",
        fontSize: "11px",
        cursor: "pointer",
      }}
    >
      📋 {label}
    </button>
  );
}

// 특정 섹션을 캡쳐 가능한 블록으로 감싸기
function CopyableSection({
  title,
  children,
  extraRight,
  onRegisterSection,
  sectionId,
  sectionType, // "표" 또는 "그래프"
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (onRegisterSection && sectionId) {
      onRegisterSection({
        id: sectionId,
        title,
        type: sectionType || "표",
        ref: containerRef,
      });
    }
  }, [onRegisterSection, sectionId, sectionType, title]);

  return (
    <div
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: "10px",
        padding: "10px 12px",
        marginBottom: "16px",
        backgroundColor: "#fafafa",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: "14px" }}>{title}</div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {extraRight}
          <CopyAsImageButton targetRef={containerRef} />
        </div>
      </div>
      <div ref={containerRef}>{children}</div>
    </div>
  );
}

// 간단한 통계 계산 유틸
function mean(arr) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function stdDev(arr) {
  if (arr.length < 2) return null;
  const m = mean(arr);
  const variance =
    arr.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

// 상관계수 (phase 합격 여부 vs 항목 점수)
function correlation(xArr, yArr) {
  const n = xArr.length;
  if (n < 2 || yArr.length !== n) return null;

  const mx = mean(xArr);
  const my = mean(yArr);
  let cov = 0;
  let sx = 0;
  let sy = 0;

  for (let i = 0; i < n; i++) {
    const dx = xArr[i] - mx;
    const dy = yArr[i] - my;
    cov += dx * dy;
    sx += dx * dx;
    sy += dy * dy;
  }

  if (sx === 0 || sy === 0) return null;

  const stdX = Math.sqrt(sx / n);
  const stdY = Math.sqrt(sy / n);
  const c = (cov / n) / (stdX * stdY);
  return c;
}

// ✅ Step6 전용 그래프/표 도구 모음 (floating)
function Step6ChartToolbox({
  barSize,
  onChangeBarSize,
  tableWidthScale,
  onChangeTableWidthScale,
  chartWidthScale,
  onChangeChartWidthScale,
}) {
  const handleBarSize = (e) => {
    const value = Number(e.target.value);
    if (Number.isFinite(value)) onChangeBarSize(value);
  };
  const handleTableWidth = (e) => {
    const value = Number(e.target.value);
    if (Number.isFinite(value)) onChangeTableWidthScale(value);
  };
  const handleChartWidth = (e) => {
    const value = Number(e.target.value);
    if (Number.isFinite(value)) onChangeChartWidthScale(value);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "110px",
        right: "24px",
        zIndex: 2000,
        width: "240px",
        maxWidth: "80vw",
        padding: "10px 12px",
        borderRadius: "14px",
        border: "1px solid #d0d7e2",
        backgroundColor: "rgba(247, 249, 252, 0.96)",
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
        fontSize: "12px",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: "13px",
          marginBottom: "8px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span>📊 그래프 · 표 도구</span>
      </div>

      {/* 막대 너비 */}
      <div
        style={{
          marginBottom: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>막대 너비</span>
          <span
            style={{
              padding: "2px 6px",
              borderRadius: "999px",
              border: "1px solid #ccc",
              backgroundColor: "#fff",
            }}
          >
            {barSize}px
          </span>
        </div>
        <input type="range" min={8} max={60} value={barSize} onChange={handleBarSize} />
      </div>

      {/* 표 너비 */}
      <div
        style={{
          marginBottom: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>표 너비</span>
          <span
            style={{
              padding: "2px 6px",
              borderRadius: "999px",
              border: "1px solid #ccc",
              backgroundColor: "#fff",
            }}
          >
            {tableWidthScale}%
          </span>
        </div>
        <input
          type="range"
          min={60}
          max={160}
          value={tableWidthScale}
          onChange={handleTableWidth}
        />
      </div>

      {/* 그래프 전체 너비 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>그래프 너비</span>
          <span
            style={{
              padding: "2px 6px",
              borderRadius: "999px",
              border: "1px solid #ccc",
              backgroundColor: "#fff",
            }}
          >
            {chartWidthScale}%
          </span>
        </div>
        <input
          type="range"
          min={60}
          max={160}
          value={chartWidthScale}
          onChange={handleChartWidth}
        />
      </div>
    </div>
  );
}

// ✅ Legend를 무조건 "합격자 → 불합격자" 순서로 고정
const renderPassFailLegend = () => {
  const boxStyle = (color) => ({
    display: "inline-block",
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 4,
    backgroundColor: color,
  });

  return (
    <div
      style={{
        display: "flex",
        gap: "16px",
        fontSize: "12px",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        <span style={boxStyle(COLORS.primary)} />
        합격자
      </span>
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        <span style={boxStyle(COLORS.secondary)} />
        불합격자
      </span>
    </div>
  );
};

export default function Step6StatsAndCharts({
  rows,
  mapping,
  supportField,
  supportGroups,
  resultMapping,
}) {
  // 지원분야 그룹별 후보자 데이터 구성
  const groupData = useMemo(() => {
    if (!rows.length || !supportField) return {};

    const phaseField = mapping.phaseResult;
    const finalField = mapping.finalResult;

    const getPhaseRole = (row) => {
      if (!phaseField) return null;
      const raw = String(row[phaseField] ?? "").trim();
      return resultMapping.phase?.[raw] || null;
    };
    const getFinalRole = (row) => {
      if (!finalField) return null;
      const raw = String(row[finalField] ?? "").trim();
      return resultMapping.final?.[raw] || null;
    };

    const evalFields = mapping.evalFields || [];

    const result = {};

    Object.entries(supportGroups).forEach(([groupName, rawSupports]) => {
      const groupRows = rows.filter((row) =>
        rawSupports.includes(String(row[supportField] ?? "").trim())
      );

      const candidates = [];

      groupRows.forEach((row) => {
        const phaseRole = getPhaseRole(row);
        if (phaseRole === "평가제외") return;

        const finalRole = getFinalRole(row);
        const evalScores = {};
        evalFields.forEach((field) => {
          const num = toNumberOrNull(row[field]);
          if (num !== null) {
            evalScores[field] = num;
          }
        });

        const evalVals = Object.values(evalScores);
        const totalScore = evalVals.length
          ? evalVals.reduce((a, b) => a + b, 0)
          : null;

        candidates.push({
          examNo: mapping.examNo ? row[mapping.examNo] : undefined,
          phaseRole,
          finalRole,
          evalScores,
          totalScore,
        });
      });

      result[groupName] = {
        candidates,
      };
    });

    return result;
  }, [rows, mapping, supportField, supportGroups, resultMapping]);

  const initialIncludedFields = useMemo(() => {
    const res = {};
    Object.entries(groupData).forEach(([groupName, { candidates }]) => {
      const set = new Set();
      candidates.forEach((c) => {
        Object.keys(c.evalScores).forEach((f) => set.add(f));
      });
      res[groupName] = Array.from(set);
    });
    return res;
  }, [groupData]);

  const [includedFieldsByGroup, setIncludedFieldsByGroup] = useState(
    initialIncludedFields
  );

  const [openGroups, setOpenGroups] = useState({});

  // ✅ Step6 전역 막대 너비 / 표 너비 / 그래프 너비 상태
  const [barSize, setBarSize] = useState(24);
  const [tableWidthScale, setTableWidthScale] = useState(100);
  const [chartWidthScale, setChartWidthScale] = useState(100);

  const groupRefs = useRef({});
  const groupSectionRefs = useRef({}); // 각 지원분야별 섹션 참조 저장

  useEffect(() => {
    setIncludedFieldsByGroup(initialIncludedFields);
  }, [initialIncludedFields]);

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      Object.keys(groupData).forEach((groupName) => {
        if (typeof next[groupName] === "undefined") {
          next[groupName] = true;
        }
      });
      return next;
    });
  }, [groupData]);

  const crossGroupSummary = useMemo(() => {
    const rows = [];

    Object.entries(groupData).forEach(([groupName, { candidates }]) => {
      const totalScores = candidates
        .map((c) => c.totalScore)
        .filter((v) => v !== null);

      const n = candidates.length;
      if (!n) {
        rows.push({
          groupName,
          n: 0,
          passRate: null,
          avgTotal: null,
          cutoff: null,
          cutoffPercent: null,
        });
        return;
      }

      const phasePass = candidates.filter((c) => c.phaseRole === "합격");

      const avgTotal = totalScores.length ? mean(totalScores) : null;

      let cutoff = null;
      let cutoffPercent = null;

      if (phasePass.length && totalScores.length) {
        const passScores = phasePass
          .map((c) => c.totalScore)
          .filter((v) => v !== null);
        if (passScores.length) {
          cutoff = Math.min(...passScores);
          const nTotal = totalScores.length;
          const nAboveCut = totalScores.filter((s) => s >= cutoff).length;
          cutoffPercent = (nAboveCut / nTotal) * 100;
        }
      }

      const passRate = n > 0 ? (phasePass.length / n) * 100 : null;

      rows.push({
        groupName,
        n,
        passRate,
        avgTotal,
        cutoff,
        cutoffPercent,
      });
    });

    return rows;
  }, [groupData]);

  const handleToggleField = (groupName, field) => () => {
    setIncludedFieldsByGroup((prev) => {
      const curr = prev[groupName] || [];
      const exists = curr.includes(field);
      const nextGroup = exists ? curr.filter((f) => f !== field) : [...curr, field];
      return {
        ...prev,
        [groupName]: nextGroup,
      };
    });
  };

  const formatLabelValue = (value) =>
    value == null ? "" : value.toFixed(1);

  // 지원분야별 섹션 일괄 다운로드
  const handleDownloadAllSections = async (groupName) => {
    const sectionsMap = groupSectionRefs.current[groupName] || {};
    const sections = Object.values(sectionsMap);

    if (!sections.length) {
      alert("이 지원분야에서 다운로드할 섹션을 찾을 수 없습니다.");
      return;
    }

    // id 기준으로 정렬 (01, 02, 03 ... 순서대로)
    sections.sort((a, b) => {
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });

    for (const section of sections) {
      const node = section.ref?.current;
      if (!node) continue;

      try {
        const canvas = await html2canvas(node, { scale: 2 });
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (!blob) continue;

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        const safeGroup = String(groupName).replace(/[\\/:*?"<>|]/g, "_");
        const safeTitle = String(section.title || "section").replace(
          /[\\/:*?"<>|]/g,
          "_"
        );
        const typePart = section.type === "그래프" ? "그래프" : "표";

        a.href = url;
        a.download = `${safeGroup}_${typePart}_${safeTitle}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // 너무 과하게 폭주하지 않게 살짝 딜레이
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <h2>6. 지원분야별 통계 · 그래프</h2>

      {/* ✅ Step 6 전용 floating 도구 모음 */}
      <Step6ChartToolbox
        barSize={barSize}
        onChangeBarSize={setBarSize}
        tableWidthScale={tableWidthScale}
        onChangeTableWidthScale={setTableWidthScale}
        chartWidthScale={chartWidthScale}
        onChangeChartWidthScale={setChartWidthScale}
      />

      {/* 지원분야 간 요약 비교 표 (전역) */}
      <CopyableSection title="지원분야 간 요약 비교">
        <div
          style={{
            width: `${tableWidthScale}%`,
            maxWidth: "100%",
            overflowX: "auto",
            resize: "horizontal",
            display: "inline-block",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    borderBottom: "1px solid #ccc",
                    textAlign: "left",
                    padding: "4px 8px",
                  }}
                >
                  지원분야(통합)
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #ccc",
                    textAlign: "right",
                    padding: "4px 8px",
                  }}
                >
                  통계 대상 인원
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #ccc",
                    textAlign: "right",
                    padding: "4px 8px",
                  }}
                >
                  전형 합격률(%)
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #ccc",
                    textAlign: "right",
                    padding: "4px 8px",
                  }}
                >
                  총점 평균
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #ccc",
                    textAlign: "right",
                    padding: "4px 8px",
                  }}
                >
                  전형 합격 커트라인 점수
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #ccc",
                    textAlign: "right",
                    padding: "4px 8px",
                  }}
                >
                  합격컷 상위 %
                </th>
              </tr>
            </thead>
            <tbody>
              {crossGroupSummary.map((row) => (
                <tr key={row.groupName}>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "4px 8px",
                    }}
                  >
                    {row.groupName}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      textAlign: "right",
                      padding: "4px 8px",
                    }}
                  >
                    {row.n}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      textAlign: "right",
                      padding: "4px 8px",
                    }}
                  >
                    {row.passRate !== null
                      ? row.passRate.toFixed(1)
                      : "-"}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      textAlign: "right",
                      padding: "4px 8px",
                    }}
                  >
                    {row.avgTotal !== null
                      ? row.avgTotal.toFixed(2)
                      : "-"}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      textAlign: "right",
                      padding: "4px 8px",
                    }}
                  >
                    {row.cutoff !== null
                      ? row.cutoff.toFixed(2)
                      : "-"}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      textAlign: "right",
                      padding: "4px 8px",
                    }}
                  >
                    {row.cutoffPercent !== null
                      ? row.cutoffPercent.toFixed(1)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CopyableSection>

      {/* 각 지원분야별 아코디언 */}
      {Object.entries(groupData).map(([groupName, { candidates }]) => {
        const includedFields = includedFieldsByGroup[groupName] || [];

        const totalScores = candidates
          .map((c) => c.totalScore)
          .filter((v) => v !== null);

        const passCandidates = candidates.filter(
          (c) => c.phaseRole === "합격"
        );
        const failCandidates = candidates.filter(
          (c) => c.phaseRole === "불합격"
        );

        const passScores = passCandidates
          .map((c) => c.totalScore)
          .filter((v) => v !== null);
        const failScores = failCandidates
          .map((c) => c.totalScore)
          .filter((v) => v !== null);

        const totalAvg = mean(totalScores);
        const totalStd = stdDev(totalScores);
        const totalMed = median(totalScores);

        const cutoff =
          passScores.length > 0 ? Math.min(...passScores) : null;
        let cutoffPercent = null;
        if (cutoff !== null && totalScores.length) {
          const nAbove = totalScores.filter((s) => s >= cutoff).length;
          cutoffPercent = (nAbove / totalScores.length) * 100;
        }

        const groupTotal = candidates.length;
        const groupPassRate =
          groupTotal > 0 ? (passCandidates.length / groupTotal) * 100 : null;

        const phaseTotalAvgData = [
          {
            phase: "합격",
            avg: passScores.length > 0 ? mean(passScores) : null,
          },
          {
            phase: "불합격",
            avg: failScores.length > 0 ? mean(failScores) : null,
          },
        ].filter((d) => d.avg !== null);

        const fieldStats = includedFields.map((field) => {
          const passFieldScores = passCandidates
            .map((c) => c.evalScores[field])
            .filter((v) => v !== null && v !== undefined);

          const failFieldScores = failCandidates
            .map((c) => c.evalScores[field])
            .filter((v) => v !== null && v !== undefined);

          const corrX = [];
          const corrY = [];
          candidates.forEach((c) => {
            const v = c.evalScores[field];
            if (v === null || v === undefined || !isNumericLike(v)) {
              return;
            }
            if (c.phaseRole === "합격") {
              corrX.push(Number(v));
              corrY.push(1);
            } else if (c.phaseRole === "불합격") {
              corrX.push(Number(v));
              corrY.push(0);
            }
          });

          const corrVal = corrX.length >= 2 ? correlation(corrX, corrY) : null;

          return {
            field,
            passAvg:
              passFieldScores.length > 0 ? mean(passFieldScores) : null,
            failAvg:
              failFieldScores.length > 0 ? mean(failFieldScores) : null,
            corr: corrVal,
          };
        });

        const fieldChartData = fieldStats.map((fs) => ({
          field: fs.field,
          passAvg: fs.passAvg,
          failAvg: fs.failAvg,
        }));

        const finalPass = candidates.filter((c) => c.finalRole === "합격");
        const finalFailPhasePass = candidates.filter(
          (c) => c.finalRole === "불합격" && c.phaseRole === "합격"
        );

        const finalCompareData = [];
        const finalPassScores = finalPass
          .map((c) => c.totalScore)
          .filter((v) => v !== null);
        const finalFailPhasePassScores = finalFailPhasePass
          .map((c) => c.totalScore)
          .filter((v) => v !== null);

        if (finalPassScores.length > 0) {
          finalCompareData.push({
            group: "최종 합격",
            avg: mean(finalPassScores),
          });
        }
        if (finalFailPhasePassScores.length > 0) {
          finalCompareData.push({
            group: "최종 불합격(전형 합격)",
            avg: mean(finalFailPhasePassScores),
          });
        }

        const open = openGroups[groupName] ?? true;

        const availableFieldsSet = new Set();
        candidates.forEach((c) => {
          Object.keys(c.evalScores).forEach((f) => availableFieldsSet.add(f));
        });
        const availableFields = Array.from(availableFieldsSet);

        const groupRefWrapper = {
          get current() {
            return groupRefs.current[groupName] || null;
          },
        };

        const registerSectionForGroup = (info) => {
          if (!info || !info.id) return;
          if (!groupSectionRefs.current[groupName]) {
            groupSectionRefs.current[groupName] = {};
          }
          groupSectionRefs.current[groupName][info.id] = info;
        };

        const handleDownloadAll = () => {
          handleDownloadAllSections(groupName);
        };

        return (
          <div
            key={groupName}
            ref={(el) => {
              groupRefs.current[groupName] = el;
            }}
            style={{
              border: "1px solid #ddd",
              borderRadius: "10px",
              marginBottom: "16px",
              backgroundColor: "#fff",
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  flex: 1,
                }}
                onClick={() =>
                  setOpenGroups((prev) => ({
                    ...prev,
                    [groupName]: !open,
                  }))
                }
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {groupName}{" "}
                    <span style={{ fontWeight: 400, fontSize: "12px" }}>
                      (통계 대상 {groupTotal}명)
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "2px",
                    }}
                  >
                    전형 합격률{" "}
                    {groupPassRate !== null
                      ? `${groupPassRate.toFixed(1)}%`
                      : "-"}
                    {cutoffPercent !== null &&
                      ` · 합격컷 상위 ${cutoffPercent.toFixed(1)}%`}
                  </div>
                </div>
                <div style={{ fontSize: "18px" }}>{open ? "▴" : "▾"}</div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <CopyAsImageButton
                  targetRef={groupRefWrapper}
                  label="이 지원분야 전체 복사"
                />
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "999px",
                    border: "1px solid #666",
                    backgroundColor: "#fff",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  ⬇ 이 지원분야 일괄 다운로드
                </button>
              </div>
            </div>

            {open && (
              <div style={{ padding: "10px 14px" }}>
                {/* 평가항목 포함/제외 토글 */}
                <CopyableSection
                  title="평가항목 포함 여부"
                  extraRight={
                    <span style={{ fontSize: "11px", color: "#666" }}>
                      체크된 항목만 통계/그래프에 반영
                    </span>
                  }
                  onRegisterSection={registerSectionForGroup}
                  sectionId="01_fieldToggle"
                  sectionType="표"
                >
                  {availableFields.length === 0 ? (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#999",
                      }}
                    >
                      이 지원분야에 사용 가능한 평가항목이 없습니다.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px 12px",
                        fontSize: "12px",
                      }}
                    >
                      {availableFields.map((f) => {
                        const checked = includedFields.includes(f);
                        return (
                          <label
                            key={f}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 8px",
                              borderRadius: "999px",
                              border: checked
                                ? `1px solid ${COLORS.primary}`
                                : "1px solid #ccc",
                              backgroundColor: checked
                                ? "#e3f2fd"
                                : "#fafafa",
                              cursor: "pointer",
                            }}
                            onClick={handleToggleField(groupName, f)}
                          >
                            <input
                              type="checkbox"
                              readOnly
                              checked={checked}
                              style={{ margin: 0 }}
                            />
                            <span>{f}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </CopyableSection>

                {/* 요약 통계 + 전형 결과별 합/불 평균 2열 */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "12px",
                    marginBottom: "8px",
                  }}
                >
                  {/* 요약 통계 */}
                  <CopyableSection
                    title="요약 통계 (총점 기준)"
                    onRegisterSection={registerSectionForGroup}
                    sectionId="02_summaryStats"
                    sectionType="표"
                  >
                    <div style={{ fontSize: "13px" }}>
                      {totalScores.length === 0 ? (
                        <div style={{ color: "#999" }}>
                          총점 데이터가 없어 통계를 계산할 수 없습니다.
                        </div>
                      ) : (
                        <div
                          style={{
                            width: `${tableWidthScale}%`,
                            maxWidth: "100%",
                            overflowX: "auto",
                            resize: "horizontal",
                            display: "inline-block",
                          }}
                        >
                          <table
                            style={{
                              borderCollapse: "collapse",
                              width: "100%",
                            }}
                          >
                            <tbody>
                              <tr>
                                <td
                                  style={{
                                    padding: "4px 8px",
                                    borderBottom: "1px solid #eee",
                                  }}
                                >
                                  최고점
                                </td>
                                <td
                                  style={{
                                    padding: "4px 8px",
                                    borderBottom: "1px solid #eee",
                                    textAlign: "right",
                                  }}
                                >
                                  {Math.max(...totalScores).toFixed(2)}
                                </td>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    padding: "4px 8px",
                                    borderBottom: "1px solid #eee",
                                  }}
                                >
                                  최저점
                                </td>
                                <td
                                  style={{
                                    padding: "4px 8px",
                                    borderBottom: "1px solid #eee",
                                    textAlign: "right",
                                  }}
                                >
                                  {Math.min(...totalScores).toFixed(2)}
                                </td>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    padding: "4px 8px",
                                    borderBottom: "1px solid #eee",
                                  }}
                                >
                                  합격자 기준 최저점 (커트라인)
                                </td>
                                <td
                                  style={{
                                    padding: "4px 8px",
                                    borderBottom: "1px solid #eee",
                                    textAlign: "right",
                                  }}
                                >
                                  {cutoff !== null ? cutoff.toFixed(2) : "-"}
                                </td>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    padding: "4px 8px",
                                    borderBottom: "1px solid #eee",
                                  }}
                                >
                                  불합격자 기준 최고점
                                </td>
                                <td
                                  style={{
                                    padding: "4px 8px",
                                    borderBottom: "1px solid #eee",
                                    textAlign: "right",
                                  }}
                                >
                                  {failScores.length
                                    ? Math.max(...failScores).toFixed(2)
                                    : "-"}
                                </td>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    padding: "4px 8px",
                                    borderBottom: "1px solid #eee",
                                  }}
                                >
                                  총점 평균
                                </td>
                                <td
                                  style={{
                                    padding: "4px 8px",
                                    borderBottom: "1px solid #eee",
                                    textAlign: "right",
                                  }}
                                >
                                  {totalAvg !== null
                                    ? totalAvg.toFixed(2)
                                    : "-"}
                                </td>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    padding: "4px 8px",
                                    borderBottom: "1px solid #eee",
                                  }}
                                >
                                  총점 중앙값
                                </td>
                                <td
                                  style={{
                                    padding: "4px 8px",
                                    borderBottom: "1px solid #eee",
                                    textAlign: "right",
                                  }}
                                >
                                  {totalMed !== null
                                    ? totalMed.toFixed(2)
                                    : "-"}
                                </td>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    padding: "4px 8px",
                                    borderBottom: "1px solid #eee",
                                  }}
                                >
                                  총점 표준편차
                                </td>
                                <td
                                  style={{
                                    padding: "4px 8px",
                                    borderBottom: "1px solid #eee",
                                    textAlign: "right",
                                  }}
                                >
                                  {totalStd !== null
                                    ? totalStd.toFixed(2)
                                    : "-"}
                                </td>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    padding: "4px 8px",
                                  }}
                                >
                                  합격컷 상위 %
                                </td>
                                <td
                                  style={{
                                    padding: "4px 8px",
                                    textAlign: "right",
                                  }}
                                >
                                  {cutoffPercent !== null
                                    ? cutoffPercent.toFixed(1)
                                    : "-"}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </CopyableSection>

                  {/* 전형 결과별 총점 평균 (그래프) */}
                  <CopyableSection
                    title="전형 결과별 합/불 총점 평균"
                    onRegisterSection={registerSectionForGroup}
                    sectionId="03_phaseTotalAvg"
                    sectionType="그래프"
                  >
                    {phaseTotalAvgData.length === 0 ? (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#999",
                        }}
                      >
                        합격/불합격 구분 가능한 데이터가 없습니다.
                      </div>
                    ) : (
                      <div
                        style={{
                          width: `${chartWidthScale}%`,
                          maxWidth: "100%",
                          height: 240,
                        }}
                      >
                        <ResponsiveContainer>
                          <BarChart
                            data={phaseTotalAvgData}
                            margin={{ top: 30, right: 20, left: 10, bottom: 10 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="phase" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar
                              dataKey="avg"
                              name="총점 평균"
                              fillOpacity={0.9}
                              barSize={barSize}
                            >
                              <LabelList
                                dataKey="avg"
                                position="top"
                                formatter={formatLabelValue}
                              />
                              {phaseTotalAvgData.map((d, idx) => (
                                <Cell
                                  key={`cell-${idx}`}
                                  fill={
                                    d.phase === "합격"
                                      ? COLORS.primary
                                      : COLORS.secondary
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CopyableSection>
                </div>

                {/* 평가항목별 합/불 평균 + 상관계수 */}
                <CopyableSection
                  title="평가항목별 합/불 평균 및 합격 공헌도(상관계수)"
                  onRegisterSection={registerSectionForGroup}
                  sectionId="04_fieldStats"
                  sectionType="그래프"
                >
                  {fieldStats.length === 0 ? (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#999",
                      }}
                    >
                      포함된 평가항목이 없습니다. 위에서 평가항목을 선택해 주세요.
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          width: `${tableWidthScale}%`,
                          maxWidth: "100%",
                          overflowX: "auto",
                          resize: "horizontal",
                          display: "inline-block",
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "12px",
                            marginBottom: "8px",
                          }}
                        >
                          <thead>
                            <tr>
                              <th
                                style={{
                                  borderBottom: "1px solid #ccc",
                                  textAlign: "left",
                                  padding: "4px 8px",
                                }}
                              >
                                평가항목
                              </th>
                              <th
                                style={{
                                  borderBottom: "1px solid #ccc",
                                  textAlign: "right",
                                  padding: "4px 8px",
                                }}
                              >
                                합격자 평균
                              </th>
                              <th
                                style={{
                                  borderBottom: "1px solid #ccc",
                                  textAlign: "right",
                                  padding: "4px 8px",
                                }}
                              >
                                불합격자 평균
                              </th>
                              <th
                                style={{
                                  borderBottom: "1px solid #ccc",
                                  textAlign: "right",
                                  padding: "4px 8px",
                                }}
                              >
                                합격 공헌도 (상관계수)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {fieldStats.map((fs) => (
                              <tr key={fs.field}>
                                <td
                                  style={{
                                    borderBottom: "1px solid #eee",
                                    padding: "4px 8px",
                                  }}
                                >
                                  {fs.field}
                                </td>
                                <td
                                  style={{
                                    borderBottom: "1px solid #eee",
                                    padding: "4px 8px",
                                    textAlign: "right",
                                  }}
                                >
                                  {fs.passAvg !== null
                                    ? fs.passAvg.toFixed(2)
                                    : "-"}
                                </td>
                                <td
                                  style={{
                                    borderBottom: "1px solid #eee",
                                    padding: "4px 8px",
                                    textAlign: "right",
                                  }}
                                >
                                  {fs.failAvg !== null
                                    ? fs.failAvg.toFixed(2)
                                    : "-"}
                                </td>
                                <td
                                  style={{
                                    borderBottom: "1px solid #eee",
                                    padding: "4px 8px",
                                    textAlign: "right",
                                  }}
                                >
                                  {fs.corr !== null
                                    ? fs.corr.toFixed(3)
                                    : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div
                        style={{
                          width: `${chartWidthScale}%`,
                          maxWidth: "100%",
                          height: 280,
                        }}
                      >
                        <ResponsiveContainer>
                          <BarChart
                            data={fieldChartData}
                            margin={{
                              top: 30,
                              right: 20,
                              left: 10,
                              bottom: 10,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="field" />
                            <YAxis />
                            <Tooltip />
                            {/* ✅ Legend 커스텀: 합격자 → 불합격자 */}
                            <Legend content={renderPassFailLegend} />
                            <Bar
                              dataKey="passAvg"
                              name="합격자"
                              fill={COLORS.primary}
                              fillOpacity={0.9}
                              barSize={barSize}
                            >
                              <LabelList
                                dataKey="passAvg"
                                position="top"
                                formatter={formatLabelValue}
                              />
                            </Bar>
                            <Bar
                              dataKey="failAvg"
                              name="불합격자"
                              fill={COLORS.secondary}
                              fillOpacity={0.9}
                              barSize={barSize}
                            >
                              <LabelList
                                dataKey="failAvg"
                                position="top"
                                formatter={formatLabelValue}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </CopyableSection>

                {/* 최종 결과 비교 그래프 */}
                <CopyableSection
                  title="채용 결과별 총점 비교"
                  onRegisterSection={registerSectionForGroup}
                  sectionId="05_finalCompare"
                  sectionType="그래프"
                >
                  {finalCompareData.length === 0 ? (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#999",
                      }}
                    >
                      최종 합격자 또는 &quot;전형 합격 후 최종 불합격&quot; 데이터가
                      없습니다.
                    </div>
                  ) : (
                    <div
                      style={{
                        width: `${chartWidthScale}%`,
                        maxWidth: "100%",
                        height: 240,
                      }}
                    >
                      <ResponsiveContainer>
                        <BarChart
                          data={finalCompareData}
                          margin={{ top: 30, right: 20, left: 10, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="group" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="avg"
                            name="총점 평균"
                            fillOpacity={0.9}
                            barSize={barSize}
                          >
                            <LabelList
                              dataKey="avg"
                              position="top"
                              formatter={formatLabelValue}
                            />
                            {finalCompareData.map((d, idx) => (
                              <Cell
                                key={`final-cell-${idx}`}
                                fill={
                                  d.group.includes("불합격")
                                    ? COLORS.secondary
                                    : COLORS.primary
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CopyableSection>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
