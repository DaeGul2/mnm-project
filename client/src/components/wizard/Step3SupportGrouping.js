// src/components/wizard/Step3SupportGrouping.js
import React, { useMemo } from "react";

export default function Step3SupportGrouping({
  rows,
  supportField,
  groups,
  onChangeGroups,
}) {
  const uniqueSupports = useMemo(() => {
    if (!rows.length || !supportField) return [];
    const set = new Set();
    rows.forEach((row) => {
      const v = String(row[supportField] ?? "").trim();
      if (v) set.add(v);
    });
    return Array.from(set);
  }, [rows, supportField]);

  const handleCopyFromOriginal = () => {
    const next = uniqueSupports.reduce((acc, s) => {
      acc[s] = [s];
      return acc;
    }, {});
    onChangeGroups(next);
  };

  const handleGroupNameChange = (oldName) => (e) => {
    const newName = e.target.value;
    if (!newName) return;
    if (newName === oldName) return;

    const next = { ...groups };
    const items = next[oldName];
    delete next[oldName];
    next[newName] = items;
    onChangeGroups(next);
  };

  const handleRemoveSupportFromGroup = (groupName, item) => () => {
    const next = { ...groups };
    next[groupName] = next[groupName].filter((s) => s !== item);
    if (next[groupName].length === 0) {
      delete next[groupName];
    }
    onChangeGroups(next);
  };

  const handleCreateEmptyGroup = () => {
    const base = "새 상위카테고리";
    let idx = 1;
    let name = `${base}${idx}`;
    const existing = new Set(Object.keys(groups));
    while (existing.has(name)) {
      idx += 1;
      name = `${base}${idx}`;
    }
    const next = { ...groups, [name]: [] };
    onChangeGroups(next);
  };

  const handleAddSupportToGroup = (groupName, support) => () => {
    const next = { ...groups };
    const list = next[groupName] || [];
    if (!list.includes(support)) {
      next[groupName] = [...list, support];
      onChangeGroups(next);
    }
  };

  const supportsNotInAnyGroup = useMemo(() => {
    const used = new Set(
      Object.values(groups).flatMap((arr) => arr || [])
    );
    return uniqueSupports.filter((s) => !used.has(s));
  }, [uniqueSupports, groups]);

  return (
    <div>
      <h2>3. 지원분야 상위 카테고리 확정</h2>
      {!supportField && (
        <p style={{ color: "red" }}>
          2단계에서 &quot;지원분야 역할 컬럼&quot;을 먼저 선택해야 한다.
        </p>
      )}

      {supportField && (
        <>
          <p>
            기준 컬럼: <strong>{supportField}</strong>
          </p>
          <p>
            unique 지원분야 개수: <strong>{uniqueSupports.length}</strong>
          </p>

          <button
            type="button"
            onClick={handleCopyFromOriginal}
            style={{
              padding: "8px 16px",
              marginTop: "8px",
              borderRadius: "8px",
              border: "1px solid #1976d2",
              backgroundColor: "#1976d2",
              color: "white",
            }}
          >
            기존 지원분야 이름으로 상위카테고리 1:1 복사
          </button>

          <button
            type="button"
            onClick={handleCreateEmptyGroup}
            style={{
              padding: "8px 16px",
              marginTop: "8px",
              marginLeft: "8px",
              borderRadius: "8px",
              border: "1px solid #555",
              backgroundColor: "white",
            }}
          >
            빈 상위카테고리 추가
          </button>

          <div style={{ marginTop: "24px", display: "flex", gap: "24px" }}>
            {/* 그룹 목록 */}
            <div style={{ flex: 1 }}>
              <h3>상위카테고리별 포함 지원분야</h3>
              {Object.keys(groups).length === 0 && (
                <p style={{ color: "#777" }}>
                  아직 상위카테고리가 없다. 위 버튼으로 생성하거나 복사하자.
                </p>
              )}
              {Object.entries(groups).map(([groupName, items]) => (
                <div
                  key={groupName}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <input
                    type="text"
                    value={groupName}
                    onChange={handleGroupNameChange(groupName)}
                    style={{
                      fontWeight: "bold",
                      width: "100%",
                      marginBottom: "8px",
                      padding: "4px 8px",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "4px 8px",
                    }}
                  >
                    {items.map((s) => (
                      <span
                        key={s}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "999px",
                          backgroundColor: "#e3f2fd",
                          fontSize: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {s}
                        <button
                          type="button"
                          onClick={handleRemoveSupportFromGroup(
                            groupName,
                            s
                          )}
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: "10px",
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    {items.length === 0 && (
                      <span style={{ color: "#aaa", fontSize: "12px" }}>
                        (아직 할당된 지원분야 없음)
                      </span>
                    )}
                  </div>

                  {/* 아직 그룹에 안 들어간 지원분야를 여기서 추가할 수 있게 */}
                  {supportsNotInAnyGroup.length > 0 && (
                    <div style={{ marginTop: "8px" }}>
                      <div style={{ fontSize: "12px", marginBottom: "4px" }}>
                        미할당 지원분야 추가:
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "4px 8px",
                        }}
                      >
                        {supportsNotInAnyGroup.map((s) => (
                          <button
                            type="button"
                            key={s}
                            onClick={handleAddSupportToGroup(groupName, s)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "999px",
                              border: "1px solid #ccc",
                              backgroundColor: "#fff",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            + {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 아직 그룹에 안 들어간 지원분야 전체 목록 */}
            <div style={{ width: "280px" }}>
              <h3>미할당 지원분야</h3>
              {supportsNotInAnyGroup.length === 0 ? (
                <p style={{ color: "#777" }}>모든 지원분야가 어떤 그룹에든 포함됨.</p>
              ) : (
                <ul>
                  {supportsNotInAnyGroup.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
