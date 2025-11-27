// src/components/wizard/Step5ResultMapping.js
import React, { useMemo } from "react";

function getUniqueValues(rows, field) {
  if (!field) return [];
  const set = new Set();
  rows.forEach((row) => {
    const v = String(row[field] ?? "").trim();
    if (v) set.add(v);
  });
  return Array.from(set);
}

export default function Step5ResultMapping({
  rows,
  phaseResultField,
  finalResultField,
  resultMapping,
  onChangeResultMapping,
}) {
  const phaseValues = useMemo(
    () => getUniqueValues(rows, phaseResultField),
    [rows, phaseResultField]
  );
  const finalValues = useMemo(
    () => getUniqueValues(rows, finalResultField),
    [rows, finalResultField]
  );

  const handlePhaseRoleChange = (value) => (e) => {
    const role = e.target.value;
    const next = {
      ...resultMapping,
      phase: {
        ...(resultMapping.phase || {}),
        [value]: role,
      },
    };
    onChangeResultMapping(next);
  };

  const handleFinalRoleChange = (value) => (e) => {
    const role = e.target.value;
    const next = {
      ...resultMapping,
      final: {
        ...(resultMapping.final || {}),
        [value]: role,
      },
    };
    onChangeResultMapping(next);
  };

  return (
    <div>
      <h2>5. 전형 및 최종 선발 결과 맵핑</h2>

      {/* (1) 해당전형 평가결과 */}
      <div style={{ marginBottom: "24px" }}>
        <h3>
          5-1. 해당전형 평가결과 컬럼 (
          {phaseResultField ? phaseResultField : "미선택"})
        </h3>
        {!phaseResultField && (
          <p style={{ color: "red" }}>
            2단계에서 &quot;해당전형 평가결과 역할 컬럼&quot;을 먼저 선택해야 한다.
          </p>
        )}
        {phaseResultField && (
          <>
            <p style={{ color: "#555" }}>
              각 실제 컬럼값이 어떤 역할(합격/불합격/평가제외/기타)을 할지 지정한다.
            </p>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "8px",
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
                    실제 컬럼값
                  </th>
                  <th
                    style={{
                      borderBottom: "1px solid #ccc",
                      textAlign: "left",
                      padding: "4px 8px",
                    }}
                  >
                    역할
                  </th>
                </tr>
              </thead>
              <tbody>
                {phaseValues.map((v) => (
                  <tr key={v}>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "4px 8px",
                      }}
                    >
                      {v}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "4px 8px",
                      }}
                    >
                      <select
                        value={resultMapping.phase?.[v] || ""}
                        onChange={handlePhaseRoleChange(v)}
                        style={{ padding: "4px 8px" }}
                      >
                        <option value="">(미지정)</option>
                        <option value="합격">합격</option>
                        <option value="불합격">불합격</option>
                        <option value="평가제외">평가제외</option>
                        <option value="기타">기타</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* (2) 최종 선발여부 */}
      <div>
        <h3>
          5-2. 해당채용 최종 선발여부 컬럼 (
          {finalResultField ? finalResultField : "미선택"})
        </h3>
        {!finalResultField && (
          <p style={{ color: "red" }}>
            2단계에서 &quot;해당채용 최종 선발여부 역할 컬럼&quot;을 먼저 선택해야 한다.
          </p>
        )}
        {finalResultField && (
          <>
            <p style={{ color: "#555" }}>
              각 실제 컬럼값이 어떤 역할(합격/불합격/기타)을 할지 지정한다.
            </p>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "8px",
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
                    실제 컬럼값
                  </th>
                  <th
                    style={{
                      borderBottom: "1px solid #ccc",
                      textAlign: "left",
                      padding: "4px 8px",
                    }}
                  >
                    역할
                  </th>
                </tr>
              </thead>
              <tbody>
                {finalValues.map((v) => (
                  <tr key={v}>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "4px 8px",
                      }}
                    >
                      {v}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "4px 8px",
                      }}
                    >
                      <select
                        value={resultMapping.final?.[v] || ""}
                        onChange={handleFinalRoleChange(v)}
                        style={{ padding: "4px 8px" }}
                      >
                        <option value="">(미지정)</option>
                        <option value="합격">합격</option>
                        <option value="불합격">불합격</option>
                        <option value="기타">기타</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
