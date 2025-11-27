// src/components/wizard/Step4EvalUsage.js
import React, { useEffect, useState } from "react";

function isNumericLike(value) {
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  if (!s) return false;
  const num = Number(s.replace(/,/g, ""));
  return !Number.isNaN(num);
}

export default function Step4EvalUsage({
  rows,
  supportField,
  groups,
  evalFields,
}) {
  const [usage, setUsage] = useState({}); // { [groupName]: { [evalField]: { status, textValues, mappings } } }

  useEffect(() => {
    if (!rows.length || !supportField || !evalFields.length) {
      setUsage({});
      return;
    }
    const next = {};

    Object.entries(groups).forEach(([groupName, supportList]) => {
      const groupRows = rows.filter((row) =>
        supportList.includes(String(row[supportField] ?? "").trim())
      );

      const fieldUsage = {};
      evalFields.forEach((field) => {
        const textValues = new Set();
        groupRows.forEach((row) => {
          const v = row[field];
          if (v === "" || v === null || v === undefined) return;
          if (!isNumericLike(v)) {
            textValues.add(String(v));
          }
        });

        const textArray = Array.from(textValues);
        fieldUsage[field] = {
          status: textArray.length === 0 ? "사용" : "미사용",
          textValues: textArray,
          mappings: {}, // { 텍스트값: 숫자값 } 사용자가 입력
        };
      });

      next[groupName] = fieldUsage;
    });

    setUsage(next);
  }, [rows, supportField, groups, evalFields]);

  const handleStatusToggle = (groupName, field) => () => {
    setUsage((prev) => {
      const next = { ...prev };
      const curr = next[groupName]?.[field];
      if (!curr) return prev;
      const newStatus = curr.status === "사용" ? "미사용" : "사용";
      next[groupName] = {
        ...next[groupName],
        [field]: {
          ...curr,
          status: newStatus,
        },
      };
      return next;
    });
  };

  const handleMappingChange =
    (groupName, field, textValue) => (e) => {
      const inputVal = e.target.value;
      setUsage((prev) => {
        const next = { ...prev };
        const curr = next[groupName]?.[field];
        if (!curr) return prev;
        const mappings = { ...(curr.mappings || {}) };
        mappings[textValue] = inputVal;
        next[groupName] = {
          ...next[groupName],
          [field]: {
            ...curr,
            mappings,
          },
        };
        return next;
      });
    };

  return (
    <div>
      <h2>4. 평가항목 사용 여부 / 텍스트 값 체크</h2>
      {!Object.keys(groups).length && (
        <p style={{ color: "red" }}>
          3단계에서 상위 지원분야(그룹)를 먼저 구성해야 한다.
        </p>
      )}
      {Object.keys(groups).length > 0 && !evalFields.length && (
        <p style={{ color: "red" }}>
          2단계에서 평가항목 역할 컬럼들을 선택해야 한다.
        </p>
      )}

      {Object.keys(groups).length > 0 && evalFields.length > 0 && (
        <>
          <p style={{ color: "#555" }}>
            각 상위 지원분야 × 평가항목에 대해, 그룹 내 모든 행이 숫자인지 체크해서
            &quot;사용/미사용&quot;을 표시한다.
          </p>

          {Object.entries(usage).map(([groupName, fieldUsage]) => (
            <div
              key={groupName}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "16px",
              }}
            >
              <h3>{groupName}</h3>
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
                      평가항목
                    </th>
                    <th
                      style={{
                        borderBottom: "1px solid #ccc",
                        textAlign: "left",
                        padding: "4px 8px",
                      }}
                    >
                      상태(사용/미사용)
                    </th>
                    <th
                      style={{
                        borderBottom: "1px solid #ccc",
                        textAlign: "left",
                        padding: "4px 8px",
                        width: "50%",
                      }}
                    >
                      미사용인 경우 텍스트 값 / 숫자 매핑
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {evalFields.map((field) => {
                    const info = fieldUsage[field];
                    if (!info) return null;
                    const isUnused = info.status === "미사용";

                    return (
                      <tr key={field}>
                        <td
                          style={{
                            borderBottom: "1px solid #eee",
                            padding: "4px 8px",
                          }}
                        >
                          {field}
                        </td>
                        <td
                          style={{
                            borderBottom: "1px solid #eee",
                            padding: "4px 8px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={handleStatusToggle(groupName, field)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "999px",
                              border: "1px solid #1976d2",
                              backgroundColor:
                                info.status === "사용" ? "#1976d2" : "#fff",
                              color:
                                info.status === "사용" ? "#fff" : "#1976d2",
                              fontSize: "12px",
                            }}
                          >
                            {info.status}
                          </button>
                        </td>
                        <td
                          style={{
                            borderBottom: "1px solid #eee",
                            padding: "4px 8px",
                            fontSize: "12px",
                          }}
                        >
                          {isUnused && info.textValues.length > 0 ? (
                            <div>
                              <div style={{ marginBottom: "4px" }}>
                                &quot;미사용&quot; 상태인 이유: 숫자가 아닌
                                값이 포함됨
                              </div>
                              {info.textValues.map((text) => (
                                <div
                                  key={text}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    marginBottom: "4px",
                                  }}
                                >
                                  <span
                                    style={{
                                      minWidth: "120px",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      backgroundColor: "#f5f5f5",
                                    }}
                                  >
                                    {text}
                                  </span>
                                  <span>→</span>
                                  <input
                                    type="text"
                                    placeholder="숫자로 변환값"
                                    value={info.mappings?.[text] ?? ""}
                                    onChange={handleMappingChange(
                                      groupName,
                                      field,
                                      text
                                    )}
                                    style={{
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      border: "1px solid #ccc",
                                    }}
                                  />
                                </div>
                              ))}
                              <div style={{ marginTop: "4px", color: "#999" }}>
                                * 실제 rows에 반영하는 로직은 이후 단계에서
                                구현 (TODO)
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "#aaa" }}>
                              텍스트 값 없음 / 사용 상태
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
