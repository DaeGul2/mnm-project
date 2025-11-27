// src/components/wizard/Step2Mapping.js
import React from "react";

export default function Step2Mapping({
  headers,
  mapping,
  onChangeMapping,
}) {
  const handleSelectChange = (roleKey) => (e) => {
    onChangeMapping({
      ...mapping,
      [roleKey]: e.target.value || "",
    });
  };

  const handleEvalToggle = (header) => () => {
    const exists = mapping.evalFields.includes(header);
    const next = exists
      ? mapping.evalFields.filter((h) => h !== header)
      : [...mapping.evalFields, header];

    onChangeMapping({
      ...mapping,
      evalFields: next,
    });
  };

  return (
    <div>
      <h2>2. 헤더 역할 매핑</h2>
      {!headers.length && (
        <p style={{ color: "red" }}>먼저 1단계에서 엑셀을 업로드해야 한다.</p>
      )}

      {headers.length > 0 && (
        <>
          <div style={{ display: "grid", gap: "16px", maxWidth: 600 }}>
            {/* 수험번호 */}
            <div>
              <label>
                <strong>수험번호 역할 컬럼 (1:1)</strong>
              </label>
              <select
                value={mapping.examNo || ""}
                onChange={handleSelectChange("examNo")}
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}
              >
                <option value="">선택</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* 지원분야 */}
            <div>
              <label>
                <strong>지원분야 역할 컬럼 (1:1)</strong>
              </label>
              <select
                value={mapping.supportField || ""}
                onChange={handleSelectChange("supportField")}
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}
              >
                <option value="">선택</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* 전형 평가결과 */}
            <div>
              <label>
                <strong>해당전형 평가결과 역할 컬럼 (1:1)</strong>
              </label>
              <select
                value={mapping.phaseResult || ""}
                onChange={handleSelectChange("phaseResult")}
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}
              >
                <option value="">선택</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* 최종 선발여부 */}
            <div>
              <label>
                <strong>해당채용 최종 선발여부 역할 컬럼 (1:1)</strong>
              </label>
              <select
                value={mapping.finalResult || ""}
                onChange={handleSelectChange("finalResult")}
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}
              >
                <option value="">선택</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 평가항목 (1:N) */}
          <div style={{ marginTop: "24px" }}>
            <label>
              <strong>평가항목 역할 컬럼들 (1:N 체크)</strong>
            </label>
            <div
              style={{
                marginTop: "8px",
                display: "flex",
                flexWrap: "wrap",
                gap: "8px 16px",
              }}
            >
              {headers.map((h) => (
                <label key={h} style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={mapping.evalFields.includes(h)}
                    onChange={handleEvalToggle(h)}
                    style={{ marginRight: "4px" }}
                  />
                  {h}
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
