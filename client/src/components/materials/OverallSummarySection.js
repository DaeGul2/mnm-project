// components/materials/OverallSummarySection.js
import React, { useMemo } from "react";

/**
 * 전체 개요용 섹션 컴포넌트
 *
 * props:
 * - roundName: 전형명 (ex. "서류전형 Step6 분석" 또는 "서류전형")
 * - rows: crossGroupSummary 배열
 * [
 * { n, cutoff, avgTotal, passRate, groupName, cutoffPercent },
 * ...
 * ]
 * - config: 섹션 개별 설정 (제목/캡션/해석/스타일/스케일 등)
 * - onChangeConfig: (nextConfig) => void // 텍스트/캡션 수정 시 사용
 * - onEditClick: () => void // 설정 모달을 열기 위한 핸들러 (추가됨)
 */
function OverallSummarySection({
  roundName,
  rows = [],
  config = {},
  onChangeConfig,
  onEditClick,
}) {
  // 기본값 (설정 컴포넌트와 동일하게 유지)
  const defaults = {
    sectionScale: 100,
    titleScale: 100,
    tableScale: 100,
    captionScale: 100,
    textScale: 100,
    titleBold: "서류전형 전체 개요",
    titlePlain: roundName || "",
    captionLabel: "표 1-1",
    captionText: "지원분야별 서류전형 결과 요약",
    interpretationText: "",
    tableHeaderBg: "#f5f5f5",
    tableHeaderBold: true,
    tableUseZebra: true,
    zebraRowColor: "#edf2ff",
    zebraBorderColor: "#b0b7c9",
    tableNumericAlign: "right",
  };

  // 외부 설정 merge
  const mergedConfig = useMemo(
    () => ({
      ...defaults,
      ...config,
    }),
    [config, roundName]
  );

  const {
    sectionScale,
    titleScale,
    tableScale,
    captionScale,
    textScale,
    titleBold,
    titlePlain,
    captionLabel,
    captionText,
    interpretationText,
    tableHeaderBg,
    tableHeaderBold,
    tableUseZebra,
    zebraRowColor,
    zebraBorderColor,
    tableNumericAlign,
  } = mergedConfig;

  // 텍스트 관련 설정만 컴포넌트 내부에서 처리
  const pushConfig = (patch) => {
    if (!onChangeConfig) return;
    onChangeConfig({
      ...mergedConfig,
      ...patch,
    });
  };

  // 스케일 계산
  const sectionScaleFactor = (sectionScale || 100) / 100;
  const titleScaleFactor = (titleScale || 100) / 100;
  const tableScaleFactor = (tableScale || 100) / 100;
  const captionScaleFactor = (captionScale || 100) / 100;
  const textScaleFactor = (textScale || 100) / 100;

  // 실제 렌더에 사용할 폰트/간격 값
  const titleFontSize = 18 * sectionScaleFactor * titleScaleFactor;
  const titleGap = 4 * sectionScaleFactor * titleScaleFactor;

  const tableFontSize = 11 * sectionScaleFactor * tableScaleFactor;
  const tableCellPaddingY = 6 * sectionScaleFactor * tableScaleFactor;
  const tableCellPaddingX = 8 * sectionScaleFactor * tableScaleFactor;

  const captionFontSize = 11 * sectionScaleFactor * captionScaleFactor;
  const textFontSize = 11 * sectionScaleFactor * textScaleFactor;
  const textLineHeight = 1.6;

  const numericAlign =
    tableNumericAlign === "left" || tableNumericAlign === "center"
      ? tableNumericAlign
      : "right";

  // 총 인원, 평균, 합격률 등 간단 요약
  const summary = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        totalN: 0,
        avgOfAvgTotal: null,
        avgPassRate: null,
      };
    }

    const totalN = rows.reduce(
      (sum, r) => sum + (typeof r.n === "number" ? r.n : 0),
      0
    );

    const avgOfAvgTotal =
      rows.reduce(
        (sum, r) =>
          sum + (typeof r.avgTotal === "number" ? r.avgTotal : 0),
        0
      ) / rows.length;

    const avgPassRate =
      rows.reduce(
        (sum, r) =>
          sum + (typeof r.passRate === "number" ? r.passRate : 0),
        0
      ) / rows.length;

    return {
      totalN,
      avgOfAvgTotal: Number.isFinite(avgOfAvgTotal)
        ? avgOfAvgTotal
        : null,
      avgPassRate: Number.isFinite(avgPassRate)
        ? avgPassRate
        : null,
    };
  }, [rows]);

  const formatNumber = (value, digits = 1) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return "-";
    }
    return Number(value).toFixed(digits);
  };

  const formatPercent = (value, digits = 1) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return "-";
    }
    return `${Number(value).toFixed(digits)}%`;
  };

  // 캡션/해석 텍스트 핸들러
  const handleCaptionChange = (key, value) => {
    pushConfig({
      [key]: value,
    });
  };

  const handleInterpretationChange = (e) => {
    pushConfig({
      interpretationText: e.target.value,
    });
  };

  return (
    <div
      className="overall-summary-section"
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8 * sectionScaleFactor,
        padding: 16 * sectionScaleFactor,
        background: "#ffffff",
        boxShadow: "0 2px 4px rgba(15, 23, 42, 0.06)",
        transformOrigin: "top left",
        position: "relative", // 설정 버튼 위치 지정용
      }}
    >
      {/* ⚙️ 설정 버튼 (모달 호출용) */}
      <button
        type="button"
        onClick={onEditClick}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          transform: "translate(50%, -50%)",
          zIndex: 10,
          border: "1px solid #d1d5db",
          padding: "4px 8px",
          borderRadius: "999px",
          fontSize: "11px",
          backgroundColor: "#f9fafb",
          cursor: "pointer",
          color: "#4b5563",
        }}
      >
        ⚙️ 설정
      </button>

      {/* 제목 */}
      <div
        style={{
          marginBottom: 12 * sectionScaleFactor,
        }}
      >
        <div
          style={{
            fontSize: titleFontSize,
            fontWeight: 700,
            color: "#111827",
          }}
        >
          {titleBold}
        </div>
        {titlePlain && (
          <div
            style={{
              marginTop: titleGap,
              fontSize: titleFontSize * 0.9,
              fontWeight: 400,
              color: "#4b5563",
            }}
          >
            {titlePlain}
          </div>
        )}
      </div>

      {/* 상단 요약 텍스트 (간단 숫자 요약) */}
      <div
        style={{
          fontSize: tableFontSize,
          color: "#4b5563",
          marginBottom: 8 * sectionScaleFactor,
        }}
      >
        
      </div>

      {/* 표 */}
      <div
        style={{
          borderRadius: 6 * sectionScaleFactor,
          border: `1px solid ${zebraBorderColor}`,
          overflow: "hidden",
          marginBottom: 6 * sectionScaleFactor,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: tableFontSize,
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: tableHeaderBg,
                borderBottom: `1px solid ${zebraBorderColor}`,
              }}
            >
              {[
                "지원분야",
                "지원자 수",
                "컷오프",
                "평균 점수",
                "합격률",
              ].map((label) => (
                <th
                  key={label}
                  style={{
                    padding: `${tableCellPaddingY}px ${tableCellPaddingX}px`,
                    textAlign: label === "지원분야" ? "left" : numericAlign,
                    fontWeight: tableHeaderBold ? 700 : 500,
                    color: "#374151",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows && rows.length > 0 ? (
              rows.map((row, index) => {
                const isZebra = tableUseZebra && index % 2 === 1;
                return (
                  <tr
                    key={row.groupName || index}
                    style={{
                      backgroundColor: isZebra ? zebraRowColor : "#ffffff",
                      borderBottom: `1px solid ${zebraBorderColor}`,
                    }}
                  >
                    <td
                      style={{
                        padding: `${tableCellPaddingY}px ${tableCellPaddingX}px`,
                        textAlign: "left",
                        color: "#111827",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.groupName || "-"}
                    </td>
                    <td
                      style={{
                        padding: `${tableCellPaddingY}px ${tableCellPaddingX}px`,
                        textAlign: numericAlign,
                        color: "#111827",
                      }}
                    >
                      {typeof row.n === "number"
                        ? row.n.toLocaleString("ko-KR")
                        : "-"}
                    </td>
                    <td
                      style={{
                        padding: `${tableCellPaddingY}px ${tableCellPaddingX}px`,
                        textAlign: numericAlign,
                        color: "#111827",
                      }}
                    >
                      {formatNumber(row.cutoff, 1)}
                    </td>
                    <td
                      style={{
                        padding: `${tableCellPaddingY}px ${tableCellPaddingX}px`,
                        textAlign: numericAlign,
                        color: "#111827",
                      }}
                    >
                      {formatNumber(row.avgTotal, 1)}
                    </td>
                    <td
                      style={{
                        padding: `${tableCellPaddingY}px ${tableCellPaddingX}px`,
                        textAlign: numericAlign,
                        color: "#111827",
                      }}
                    >
                      {formatPercent(row.passRate, 1)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: `${tableCellPaddingY}px ${tableCellPaddingX}px`,
                    textAlign: "center",
                    color: "#9ca3af",
                  }}
                >
                  데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 캡션 + 설명 텍스트 (텍스트는 컴포넌트 내부에서 수정 가능) */}
      <div
        style={{
          fontSize: captionFontSize,
          color: "#4b5563",
          marginBottom: 8 * sectionScaleFactor,
          display: "flex",
          flexWrap: "wrap",
          gap: 4 * sectionScaleFactor,
          alignItems: "baseline",
        }}
      >
        <input
          type="text"
          value={captionLabel}
          onChange={(e) => handleCaptionChange("captionLabel", e.target.value)}
          style={{
            width: 80 * sectionScaleFactor,
            fontSize: captionFontSize,
            fontWeight: 600,
            border: "none",
            borderBottom: "1px dashed #d1d5db",
            background: "transparent",
            padding: 0,
            marginRight: 4,
          }}
        />
        <input
          type="text"
          value={captionText}
          onChange={(e) => handleCaptionChange("captionText", e.target.value)}
          style={{
            flex: 1,
            minWidth: 160,
            fontSize: captionFontSize,
            border: "none",
            borderBottom: "1px dashed #e5e7eb",
            background: "transparent",
            padding: 0,
          }}
        />
      </div>

      {/* 해석 텍스트 */}
      <div>
        <textarea
          value={interpretationText || ""}
          onChange={handleInterpretationChange}
          placeholder="이 표를 기반으로 한 전체 개요/해석을 작성하세요."
          style={{
            width: "100%",
            minHeight: 80 * sectionScaleFactor,
            resize: "vertical",
            fontSize: textFontSize,
            lineHeight: textLineHeight,
            padding: 8 * sectionScaleFactor,
            borderRadius: 6 * sectionScaleFactor,
            border: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
            color: "#111827",
          }}
        />
      </div>
    </div>
  );
}

export default OverallSummarySection;