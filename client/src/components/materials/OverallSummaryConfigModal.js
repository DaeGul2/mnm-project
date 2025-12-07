// src/components/materials/OverallSummaryConfigModal.js
import React, { useState, useEffect, useMemo } from "react";

/**
 * OverallSummarySection의 설정 모달 컴포넌트입니다.
 *
 * props:
 * - isOpen: 모달 표시 여부
 * - onClose: 모달 닫기 핸들러
 * - initialConfig: 현재 섹션의 config 객체
 * - roundName: 전형명 (제목 기본값 제공용)
 * - onSave: (newConfig) => void, 저장 핸들러
 */
function OverallSummaryConfigModal({
  isOpen,
  onClose,
  initialConfig,
  roundName,
  onSave,
}) {
  const [localConfig, setLocalConfig] = useState(initialConfig);

  useEffect(() => {
    // 모달이 열릴 때마다 초기 설정을 로드합니다.
    setLocalConfig(initialConfig);
  }, [initialConfig, isOpen]);

  // 기본값 병합 (OverallSummarySection의 기본값과 동일)
  const mergedConfig = useMemo(() => {
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
    return { ...defaults, ...localConfig };
  }, [localConfig, roundName]);

  if (!isOpen) return null;

  const pushConfig = (patch) => {
    setLocalConfig((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const handleScaleChange = (key, value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    const clamped = Math.min(150, Math.max(50, num));
    pushConfig({
      [key]: clamped,
    });
  };

  const handleStyleToggle = (key) => {
    pushConfig({
      [key]: !mergedConfig[key],
    });
  };

  const handleNumericAlignChange = (e) => {
    const v = e.target.value;
    pushConfig({
      tableNumericAlign: v,
    });
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const numericAlign =
    mergedConfig.tableNumericAlign === "left" ||
    mergedConfig.tableNumericAlign === "center"
      ? mergedConfig.tableNumericAlign
      : "right";

  // 모달 스타일
  const modalStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  };

  const contentStyle = {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    width: "450px",
    maxHeight: "80vh",
    overflowY: "auto",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    fontSize: "12px",
  };

  const TitleInput = ({ label, configKey }) => (
    <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
      <label style={{ width: "80px", color: "#4b5563" }}>{label}</label>
      <input
        type="text"
        value={mergedConfig[configKey]}
        onChange={(e) => pushConfig({ [configKey]: e.target.value })}
        style={{
          flex: 1,
          padding: "4px 8px",
          border: "1px solid #d1d5db",
          borderRadius: "4px",
          fontSize: "12px",
        }}
      />
    </div>
  );

  const ScaleControl = ({ label, configKey }) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "110px 1fr 60px",
        alignItems: "center",
        gap: "8px",
        marginBottom: "6px",
      }}
    >
      <div style={{ fontSize: "11px", color: "#374151" }}>{label}</div>
      <input
        type="range"
        min={50}
        max={150}
        step={5}
        value={mergedConfig[configKey]}
        onChange={(e) => handleScaleChange(configKey, e.target.value)}
      />
      <div
        style={{
          fontSize: "11px",
          color: "#374151",
          textAlign: "right",
        }}
      >
        {mergedConfig[configKey]}%
      </div>
    </div>
  );

  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: "10px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
            전체 개요 섹션 설정
          </h2>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: "16px",
              color: "#6b7280",
            }}
          >
            ×
          </button>
        </div>

        {/* 1. 텍스트/제목 설정 */}
        <div style={{ marginBottom: "16px", border: "1px solid #e5e7eb", padding: "10px", borderRadius: "6px" }}>
          <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "13px" }}>
            텍스트 및 제목
          </div>
          <TitleInput label="굵은 제목" configKey="titleBold" />
          <TitleInput label="일반 제목" configKey="titlePlain" />
          <TitleInput label="캡션 라벨" configKey="captionLabel" />
          <TitleInput label="캡션 텍스트" configKey="captionText" />
        </div>

        {/* 2. 크기 조절 */}
        <div style={{ marginBottom: "16px", border: "1px solid #e5e7eb", padding: "10px", borderRadius: "6px" }}>
          <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "13px" }}>
            크기 스케일 (50% ~ 150%)
          </div>
          <ScaleControl label="섹션 전체" configKey="sectionScale" />
          <ScaleControl label="제목 크기" configKey="titleScale" />
          <ScaleControl label="표 크기" configKey="tableScale" />
          <ScaleControl label="캡션 크기" configKey="captionScale" />
          <ScaleControl label="설명 텍스트" configKey="textScale" />
        </div>

        {/* 3. 표 스타일 설정 */}
        <div style={{ marginBottom: "20px", border: "1px solid #e5e7eb", padding: "10px", borderRadius: "6px" }}>
          <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "13px" }}>
            표 스타일 옵션
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <input
                type="checkbox"
                checked={mergedConfig.tableHeaderBold}
                onChange={() => handleStyleToggle("tableHeaderBold")}
              />
              <span style={{ fontSize: "12px", color: "#4b5563" }}>
                헤더 볼드
              </span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <input
                type="checkbox"
                checked={mergedConfig.tableUseZebra}
                onChange={() => handleStyleToggle("tableUseZebra")}
              />
              <span style={{ fontSize: "12px", color: "#4b5563" }}>
                지브라 행 (줄무늬)
              </span>
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                color: "#4b5563",
              }}
            >
              숫자 정렬
              <select
                value={numericAlign}
                onChange={handleNumericAlignChange}
                style={{
                  fontSize: "12px",
                  padding: "4px 6px",
                  borderRadius: "4px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#ffffff",
                }}
              >
                <option value="left">왼쪽</option>
                <option value="center">가운데</option>
                <option value="right">오른쪽</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: "4px",
              border: "1px solid #d1d5db",
              backgroundColor: "#fff",
              cursor: "pointer",
              marginRight: "8px",
            }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "8px 16px",
              borderRadius: "4px",
              border: "1px solid #2563eb",
              backgroundColor: "#2563eb",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            설정 저장
          </button>
        </div>
      </div>
    </div>
  );
}

export default OverallSummaryConfigModal;