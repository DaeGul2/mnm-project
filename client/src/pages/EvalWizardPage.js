// src/pages/EvalWizardPage.js
import React, { useState } from "react";
import Step1Upload from "../components/wizard/Step1Upload";
import Step2Mapping from "../components/wizard/Step2Mapping";
import Step3SupportGrouping from "../components/wizard/Step3SupportGrouping";
import Step4EvalUsage from "../components/wizard/Step4EvalUsage";
import Step5ResultMapping from "../components/wizard/Step5ResultMapping";
import Step6StatsAndCharts from "../components/wizard/Step6StatsAndCharts";

const containerStyle = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "24px 16px 40px",
};

const stepHeaderStyle = {
  display: "flex",
  gap: "8px",
  marginBottom: "16px",
  flexWrap: "wrap",
};

const stepItemStyle = (active) => ({
  padding: "8px 12px",
  borderRadius: "999px",
  border: active ? "2px solid #1976d2" : "1px solid #ccc",
  backgroundColor: active ? "#e3f2fd" : "#f5f5f5",
  fontSize: "13px",
});

export default function EvalWizardPage() {
  const [activeStep, setActiveStep] = useState(0);

  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);

  // 2단계 매핑 상태
  const [mapping, setMapping] = useState({
    examNo: "",
    supportField: "",
    evalFields: [],
    phaseResult: "",
    finalResult: "",
  });

  // 3단계 지원분야 상위 카테고리
  // 형태: { [groupName]: [지원분야1, 지원분야2, ...] }
  const [supportGroups, setSupportGroups] = useState({});

  // 5단계 결과 맵핑
  // { phase: { 실제값: 역할 }, final: { 실제값: 역할 } }
  const [resultMapping, setResultMapping] = useState({
    phase: {},
    final: {},
  });

  const steps = [
    "엑셀 업로드",
    "헤더 역할 매핑",
    "지원분야 상위 카테고리",
    "평가항목 valid check",
    "전형/최종 결과 맵핑",
    "통계 · 그래프",
  ];

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleExcelParsed = ({ headers, rows }) => {
    setHeaders(headers);
    setRows(rows);
    // 엑셀 바꾸면 매핑/그룹 등은 리셋
    setMapping({
      examNo: "",
      supportField: "",
      evalFields: [],
      phaseResult: "",
      finalResult: "",
    });
    setSupportGroups({});
    setResultMapping({ phase: {}, final: {} });
    setActiveStep(1);
  };

  const canGoNext = () => {
    if (activeStep === 0) {
      return headers.length > 0;
    }
    if (activeStep === 1) {
      return (
        mapping.examNo &&
        mapping.supportField &&
        mapping.evalFields.length > 0 &&
        mapping.phaseResult &&
        mapping.finalResult
      );
    }
    if (activeStep === 2) {
      return Object.keys(supportGroups).length > 0;
    }
    // 3~5는 일단 자유롭게 진행
    return true;
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "#f0f2f5",
      }}
    >
      <div style={containerStyle}>
        <h1>평가 데이터 위자드 (테스트 페이지)</h1>

        {/* Step Indicator */}
        <div style={stepHeaderStyle}>
          {steps.map((label, idx) => (
            <div key={label} style={stepItemStyle(idx === activeStep)}>
              {idx + 1}. {label}
            </div>
          ))}
        </div>

        <div
          style={{
            borderRadius: "12px",
            backgroundColor: "#fff",
            padding: "20px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          }}
        >
          {activeStep === 0 && (
            <Step1Upload onParsed={handleExcelParsed} />
          )}
          {activeStep === 1 && (
            <Step2Mapping
              headers={headers}
              mapping={mapping}
              onChangeMapping={setMapping}
            />
          )}
          {activeStep === 2 && (
            <Step3SupportGrouping
              rows={rows}
              supportField={mapping.supportField}
              groups={supportGroups}
              onChangeGroups={setSupportGroups}
            />
          )}
          {activeStep === 3 && (
            <Step4EvalUsage
              rows={rows}
              supportField={mapping.supportField}
              groups={supportGroups}
              evalFields={mapping.evalFields}
            />
          )}
          {activeStep === 4 && (
            <Step5ResultMapping
              rows={rows}
              phaseResultField={mapping.phaseResult}
              finalResultField={mapping.finalResult}
              resultMapping={resultMapping}
              onChangeResultMapping={setResultMapping}
            />
          )}
          {activeStep === 5 && (
            <Step6StatsAndCharts
              rows={rows}
              mapping={mapping}
              supportField={mapping.supportField}
              supportGroups={supportGroups}
              resultMapping={resultMapping}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <button
            type="button"
            onClick={handleBack}
            disabled={activeStep === 0}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              backgroundColor: "#fff",
              cursor: activeStep === 0 ? "not-allowed" : "pointer",
              opacity: activeStep === 0 ? 0.5 : 1,
            }}
          >
            이전
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext()}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              border: "1px solid #1976d2",
              backgroundColor: canGoNext() ? "#1976d2" : "#90caf9",
              color: "#fff",
              cursor: canGoNext() ? "pointer" : "not-allowed",
            }}
          >
            {activeStep === steps.length - 1 ? "완료" : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}
