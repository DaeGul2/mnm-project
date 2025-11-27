// src/components/wizard/Step6StatsAndCharts.js
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
} from "recharts";

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
function CopyAsImageButton({ targetRef, label = "이미지로 복사" }) {
  const handleCopy = async () => {
    const node = targetRef.current;
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
          alert("이미지 형태로 클립보드에 복사했습니다.");
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
function CopyableSection({ title, children, extraRight }) {
  const containerRef = useRef(null);

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

    // 행 → 역할 계산 함수
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
        // 평가제외는 전부 제거
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

  // 그룹별 기본 포함 평가항목: 해당 그룹에서 값이 한 번이라도 숫자로 잡힌 항목
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

  // 아코디언 open 상태: { [groupName]: boolean }
  const [openGroups, setOpenGroups] = useState({});

  useEffect(() => {
    setIncludedFieldsByGroup(initialIncludedFields);
  }, [initialIncludedFields]);

  useEffect(() => {
    // 새로 생긴 그룹은 기본적으로 open = true
    setOpenGroups((prev) => {
      const next = { ...prev };
      Object.keys(groupData).forEach((groupName) => {
        if (typeof next[groupName] === "undefined") {
          next[groupName] = true;
        }
      });
      // 사라진 그룹은 굳이 정리 안 해도 문제 없음
      return next;
    });
  }, [groupData]);

  // 지원분야 간 요약 비교용 데이터
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

  return (
    <div>
      <h2>6. 지원분야별 통계 · 그래프</h2>

      {/* 지원분야 간 요약 비교 표 */}
      <CopyableSection title="지원분야 간 요약 비교">
        <div style={{ overflowX: "auto" }}>
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

        const passScores = passCandidates
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

        // 전형 결과별 총점 평균 (그래프용)
        const failCandidates = candidates.filter(
          (c) => c.phaseRole === "불합격"
        );
        const failScores = failCandidates
          .map((c) => c.totalScore)
          .filter((v) => v !== null);

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

        // 평가항목별 합/불 평균 + 상관계수
        const fieldStats = includedFields.map((field) => {
          const passFieldScores = passCandidates
            .map((c) => c.evalScores[field])
            .filter((v) => v !== null && v !== undefined);

          const failFieldScores = failCandidates
            .map((c) => c.evalScores[field])
            .filter((v) => v !== null && v !== undefined);

          // 상관계수 계산용 데이터
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

        // 최종결과 vs 전형결과 조합 비교: 최종합격 vs (최종불합격 + 전형합격)
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

        // 평가항목 토글 리스트용: 이 그룹에서 실제로 등장한 평가항목
        const availableFieldsSet = new Set();
        candidates.forEach((c) => {
          Object.keys(c.evalScores).forEach((f) => availableFieldsSet.add(f));
        });
        const availableFields = Array.from(availableFieldsSet);

        return (
          <div
            key={groupName}
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
                cursor: "pointer",
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
                                ? "1px solid #1976d2"
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

                {/* Big 통계 */}
                <CopyableSection title="요약 통계 (총점 기준)">
                  <div style={{ fontSize: "13px" }}>
                    {totalScores.length === 0 ? (
                      <div style={{ color: "#999" }}>
                        총점 데이터가 없어 통계를 계산할 수 없습니다.
                      </div>
                    ) : (
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
                              {totalAvg !== null ? totalAvg.toFixed(2) : "-"}
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
                              {totalMed !== null ? totalMed.toFixed(2) : "-"}
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
                              {totalStd !== null ? totalStd.toFixed(2) : "-"}
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
                    )}
                  </div>
                </CopyableSection>

                {/* 전형 결과별 총점 평균 (그래프) */}
                <CopyableSection title="전형 결과별 총점 평균 (합격 vs 불합격)">
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
                    <div style={{ width: "100%", height: 240 }}>
                      <ResponsiveContainer>
                        <BarChart data={phaseTotalAvgData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="phase" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="avg" name="총점 평균" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CopyableSection>

                {/* 평가항목별 합/불 평균 + 상관계수 (표 + 그래프) */}
                <CopyableSection title="평가항목별 합/불 평균 및 합격 공헌도(상관계수)">
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
                      <div style={{ overflowX: "auto" }}>
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

                      <div style={{ width: "100%", height: 280 }}>
                        <ResponsiveContainer>
                          <BarChart data={fieldChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="field" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="passAvg" name="합격 평균" />
                            <Bar dataKey="failAvg" name="불합격 평균" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </CopyableSection>

                {/* 최종 결과 비교 그래프 */}
                <CopyableSection title="채용 결과별 총점 비교">
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
                    <div style={{ width: "100%", height: 240 }}>
                      <ResponsiveContainer>
                        <BarChart data={finalCompareData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="group" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="avg" name="총점 평균" />
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
