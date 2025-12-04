// src/pages/EvalWizardPage.js
import React, { useState, useEffect } from "react";
import Step1Upload from "../components/wizard/Step1Upload";
import Step2Mapping from "../components/wizard/Step2Mapping";
import Step3SupportGrouping from "../components/wizard/Step3SupportGrouping";
import Step4EvalUsage from "../components/wizard/Step4EvalUsage";
import Step5ResultMapping from "../components/wizard/Step5ResultMapping";
import Step6StatsAndCharts from "../components/wizard/Step6StatsAndCharts";

import {
  listProjects,
  createProject,
  unlockProject,
  getProjectToken,
  saveProjectToken,
  removeProjectToken,   // ✅ 이거 추가,
  updateProject,          // ✅ 추가
} from "../services/projectService";
import {
  listRoundsByProject,
  getRoundDetail,
  deleteRound,
  replaceRoundData,
  createRound,
  updateRoundConfig,
} from "../services/evalRoundService";

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

const projectBarStyle = {
  marginBottom: "16px",
  padding: "12px 16px",
  borderRadius: "12px",
  backgroundColor: "#f7f9fc",
  border: "1px solid #d0d7e2",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const projectRowStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  alignItems: "center",
};

const labelStyle = {
  fontSize: "13px",
  fontWeight: 600,
  marginRight: "4px",
};

const inputStyle = {
  padding: "6px 8px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  fontSize: "13px",
};

const smallButtonStyle = {
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid #1976d2",
  backgroundColor: "#1976d2",
  color: "#fff",
  fontSize: "12px",
  cursor: "pointer",
};

const ghostButtonStyle = {
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  backgroundColor: "#fff",
  fontSize: "12px",
  cursor: "pointer",
};

const roundBadgeStyle = (active) => ({
  padding: "4px 8px",
  borderRadius: "999px",
  border: active ? "2px solid #1976d2" : "1px solid #ccc",
  backgroundColor: active ? "#e3f2fd" : "#fff",
  fontSize: "12px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
});

const roundDeleteButtonStyle = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: "10px",
  color: "#b71c1c",
  padding: 0,
};

export default function EvalWizardPage() {
  const [activeStep, setActiveStep] = useState(0);

  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);

  const [mapping, setMapping] = useState({
    examNo: "",
    supportField: "",
    evalFields: [],
    phaseResult: "",
    finalResult: "",
  });

  const [supportGroups, setSupportGroups] = useState({});
  const [resultMapping, setResultMapping] = useState({
    phase: {},
    final: {},
  });

  // 프로젝트 관련 상태
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectToken, setProjectToken] = useState("");
  const [projectPassword, setProjectPassword] = useState("");
  const [projectStatus, setProjectStatus] = useState("");

  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectPassword, setNewProjectPassword] = useState("");

  // 전형 관련 상태
  const [rounds, setRounds] = useState([]);
  const [loadingRounds, setLoadingRounds] = useState(false);
  const [roundStatus, setRoundStatus] = useState("");
  const [selectedRoundId, setSelectedRoundId] = useState(null);

  // 전형 모드: 불러오기 / 새로 만들기
  const [roundMode, setRoundMode] = useState("load"); // "load" | "new"
  const [newRoundName, setNewRoundName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // ✅ 이름 수정용 상태
  const [editProjectName, setEditProjectName] = useState("");
  const [editRoundName, setEditRoundName] = useState("");

  const steps = [
    "엑셀 업로드",
    "헤더 역할 매핑",
    "지원분야 상위 카테고리",
    "평가항목 valid check",
    "전형/최종 결과 맵핑",
    "통계 · 그래프",
  ];

  const defaultMapping = {
    examNo: "",
    supportField: "",
    evalFields: [],
    phaseResult: "",
    finalResult: "",
  };

  // 프로젝트 목록 로딩
  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const list = await listProjects();
      setProjects(list || []);
      if (list && list.length > 0) {
        setSelectedProjectId((prev) => {
          const exists = list.some((p) => String(p.id) === String(prev));
          return exists ? prev : String(list[0].id);
        });
      } else {
        setSelectedProjectId("");
      }
    } catch (err) {
      console.error("loadProjects error:", err);
      setProjectStatus("프로젝트 목록 조회 중 오류가 발생했습니다.");
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // 프로젝트 선택 변경 시 토큰 / 전형 목록 처리
  useEffect(() => {
    if (!selectedProjectId) {
      setProjectToken("");
      setProjectPassword("");
      setRounds([]);
      setSelectedRoundId(null);
      setProjectStatus("");
      setRoundStatus("");
      return;
    }

    const token = getProjectToken(selectedProjectId);
    if (token) {
      setProjectToken(token);
      setProjectStatus("프로젝트 잠금 해제됨");
      loadRounds(selectedProjectId, token);
    } else {
      setProjectToken("");
      setRounds([]);
      setSelectedRoundId(null);
      setProjectStatus("프로젝트 비밀번호를 입력해 잠금을 해제하세요.");
      setRoundStatus("");
    }
  }, [selectedProjectId, projects]);

  // 전형 목록 로딩
  const loadRounds = async (projectId, token) => {
    if (!projectId || !token) return;
    try {
      setLoadingRounds(true);
      const list = await listRoundsByProject(projectId, token);
      setRounds(list || []);
      setRoundStatus(list && list.length ? "" : "등록된 전형이 없습니다.");
    } catch (err) {
      console.error("loadRounds error:", err);
      // ✅ 토큰 만료 처리
      if (err?.response?.status === 401) {
        handleTokenExpired();
      } else {
        setRoundStatus("전형 목록 조회 중 오류가 발생했습니다.");
      }
    } finally {
      setLoadingRounds(false);
    }
  };

  const resetWizardState = () => {
    setHeaders([]);
    setRows([]);
    setMapping(defaultMapping);
    setSupportGroups({});
    setResultMapping({ phase: {}, final: {} });
    setActiveStep(0);
  };

  const handleExcelParsed = ({ headers: parsedHeaders, rows: parsedRows }) => {
    setHeaders(parsedHeaders);
    setRows(parsedRows);
    setMapping(defaultMapping);
    setSupportGroups({});
    setResultMapping({ phase: {}, final: {} });
    if (roundMode === "new") {
      setSelectedRoundId(null);
    }
    setActiveStep(1);
  };

  const handleUpdateProjectName = async () => {
    if (!ensureProjectUnlocked()) return;
    if (!editProjectName.trim()) {
      setProjectStatus("프로젝트 이름을 입력하세요.");
      return;
    }
    try {
      setProjectStatus("프로젝트 이름 수정 중...");
      const updated = await updateProject(
        selectedProjectId,
        { name: editProjectName.trim() },
        projectToken
      );

      // 로컬 목록 반영
      setProjects((prev) =>
        prev.map((p) =>
          Number(p.id) === Number(updated.id) ? { ...p, name: updated.name } : p
        )
      );

      setProjectStatus("프로젝트 이름이 수정되었습니다.");
    } catch (err) {
      console.error("handleUpdateProjectName error:", err);
      if (err?.response?.status === 401) {
        handleTokenExpired();
      } else {
        setProjectStatus("프로젝트 이름 수정 중 오류가 발생했습니다.");
      }
    }
  };


  const handleUpdateRoundName = async () => {
    if (!ensureProjectUnlocked()) return;
    if (!selectedRoundId) {
      setRoundStatus("먼저 전형을 선택하세요.");
      return;
    }
    if (!editRoundName.trim()) {
      setRoundStatus("전형 이름을 입력하세요.");
      return;
    }
    try {
      setRoundStatus("전형 이름 수정 중...");
      const updatedRound = await updateRoundConfig(
        selectedRoundId,
        { name: editRoundName.trim() },
        projectToken
      );

      // 로컬 전형 목록 이름 갱신
      setRounds((prev) =>
        prev.map((r) =>
          Number(r.id) === Number(updatedRound.id)
            ? { ...r, name: updatedRound.name }
            : r
        )
      );

      setRoundStatus("전형 이름이 수정되었습니다.");
    } catch (err) {
      console.error("handleUpdateRoundName error:", err);
      if (err?.response?.status === 401) {
        handleTokenExpired();
      } else {
        setRoundStatus("전형 이름 수정 중 오류가 발생했습니다.");
      }
    }
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
    return true;
  };

  const handleBack = () => {
    if (isSaving) return;
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const ensureProjectUnlocked = () => {
    if (!selectedProjectId) {
      setProjectStatus("프로젝트를 먼저 선택하세요.");
      return false;
    }
    if (!projectToken) {
      setProjectStatus("프로젝트 비밀번호를 입력해 잠금을 해제하세요.");
      return false;
    }
    return true;
  };

  const handleTokenExpired = () => {
    if (!selectedProjectId) return;
    removeProjectToken(selectedProjectId);
    setProjectToken("");
    setProjectPassword("");
    setRounds([]);
    setSelectedRoundId(null);
    setProjectStatus(
      "프로젝트 토큰이 만료되었습니다. 비밀번호를 다시 입력해 잠금을 해제하세요."
    );
    setRoundStatus("");
  };

  // ✅ 사용자가 직접 "비밀번호 다시 입력" 눌렀을 때
  const handleForceRelock = () => {
    if (!selectedProjectId) return;
    removeProjectToken(selectedProjectId);
    setProjectToken("");
    setProjectPassword("");
    setRounds([]);
    setSelectedRoundId(null);
    setProjectStatus(
      "프로젝트 잠금을 재설정했습니다. 비밀번호를 다시 입력해 잠금을 해제하세요."
    );
    setRoundStatus("");
  };

  // 새 프로젝트 생성
  const handleCreateProject = async () => {
    if (!newProjectName || !newProjectPassword) {
      setProjectStatus("프로젝트 이름과 비밀번호는 필수입니다.");
      return;
    }
    try {
      setProjectStatus("프로젝트 생성 중...");
      const project = await createProject({
        name: newProjectName,
        description: newProjectDesc || undefined,
        password: newProjectPassword,
      });

      setNewProjectName("");
      setNewProjectDesc("");
      setNewProjectPassword("");
      setIsCreatingProject(false);

      await loadProjects();
      setSelectedProjectId(String(project.id));
      setProjectStatus("프로젝트가 생성되었습니다. 비밀번호로 잠금을 해제하세요.");
    } catch (err) {
      console.error("handleCreateProject error:", err);
      setProjectStatus("프로젝트 생성 중 오류가 발생했습니다.");
    }
  };

  // 프로젝트 잠금 해제
  const handleUnlockProject = async () => {
    if (!selectedProjectId || !projectPassword) {
      setProjectStatus("프로젝트와 비밀번호를 모두 입력하세요.");
      return;
    }
    try {
      setProjectStatus("비밀번호 검증 중...");
      const { token } = await unlockProject(selectedProjectId, projectPassword);
      setProjectToken(token);
      saveProjectToken(selectedProjectId, token);
      setProjectPassword("");
      setProjectStatus("프로젝트 잠금 해제 완료.");
      await loadRounds(selectedProjectId, token);
    } catch (err) {
      console.error("handleUnlockProject error:", err);
      setProjectStatus("비밀번호가 올바르지 않거나 오류가 발생했습니다.");
    }
  };

  // 전형 열기 (불러오기)
  const handleOpenRound = async (round) => {
    if (!projectToken) {
      setRoundStatus("먼저 프로젝트 잠금을 해제하세요.");
      return;
    }
    try {
      setRoundStatus("전형 데이터를 불러오는 중...");
      const { round: roundData, rows: rowData } = await getRoundDetail(
        round.id,
        projectToken
      );

      setSelectedRoundId(round.id);
      setRoundMode("load");
      setEditRoundName(roundData?.name || round.name || "");
      setHeaders(roundData?.headers_json || []);
      setRows(Array.isArray(rowData) ? rowData : []);
      setMapping(roundData?.mapping_json || defaultMapping);
      setSupportGroups(roundData?.support_groups_json || {});
      setResultMapping(
        roundData?.result_mapping_json || { phase: {}, final: {} }
      );

      const maxStep = roundData?.max_step_reached || 5;
      setActiveStep(Math.min(maxStep, steps.length - 1));
      setRoundStatus("");
    } catch (err) {
      console.error("handleOpenRound error:", err);
      // ✅ 토큰 만료 처리
      if (err?.response?.status === 401) {
        handleTokenExpired();
      } else {
        setRoundStatus("전형 데이터를 불러오는 중 오류가 발생했습니다.");
      }
    }
  };

  // 전형 삭제
  const handleDeleteRound = async (round) => {
    if (!projectToken) {
      setRoundStatus("먼저 프로젝트 잠금을 해제하세요.");
      return;
    }
    const confirmed = window.confirm(
      `전형 "${round.name}" 및 모든 엑셀 행이 삭제됩니다. 계속할까요?`
    );
    if (!confirmed) return;

    try {
      setRoundStatus("전형을 삭제하는 중...");
      await deleteRound(round.id, projectToken);
      const projectId = selectedProjectId;
      await loadRounds(projectId, projectToken);
      if (selectedRoundId === round.id) {
        setSelectedRoundId(null);
        resetWizardState();
      }
      setRoundStatus("전형이 삭제되었습니다.");
    } catch (err) {
      console.error("handleDeleteRound error:", err);
      // ✅ 토큰 만료 처리
      if (err?.response?.status === 401) {
        handleTokenExpired();
      } else {
        setRoundStatus("전형 삭제 중 오류가 발생했습니다.");
      }
    }
  };


  // 새 전형 모드 진입
  const handleStartNewRound = () => {
    if (!ensureProjectUnlocked()) return;
    if (!newRoundName.trim()) {
      setRoundStatus("새 전형 이름을 입력하세요.");
      return;
    }
    setRoundMode("new");
    setSelectedRoundId(null);
    resetWizardState();
    setRoundStatus(`새 전형 "${newRoundName}" 작성 중 (Step1부터 시작).`);
  };

  // Step 이동 시 서버에 저장
  const handleNext = async () => {
    if (!canGoNext() || isSaving) return;

    try {
      setIsSaving(true);

      // Step2 끝날 때: 새 전형이면 생성 / 기존 전형이면 엑셀+설정 갈아끼우기
      if (activeStep === 1) {
        if (!ensureProjectUnlocked()) return;

        if (!selectedRoundId && roundMode === "new") {
          // 새 전형 최초 저장
          const created = await createRound(
            selectedProjectId,
            {
              name: newRoundName || "이름없는 전형",
              headers,
              rows,
              mapping,
              supportGroups,
              resultMapping,
            },
            projectToken
          );
          setSelectedRoundId(created.id);
          setEditRoundName(created.name || "");   // ✅ 추가
          await loadRounds(selectedProjectId, projectToken);
          setRoundStatus(`전형 "${created.name}"이 저장되었습니다.`);
          setRoundMode("load");
        } else if (selectedRoundId) {
          // 기존 전형: 엑셀/행 전체 갈아끼우기 + 매핑 갱신
          await replaceRoundData(
            selectedRoundId,
            {
              headers,
              rows,
              mapping,
              supportGroups,
              resultMapping,
              maxStepReached: 2,
            },
            projectToken
          );
          setRoundStatus("전형의 엑셀 데이터와 설정이 갱신되었습니다.");
        }
      }

      // Step3 끝날 때: supportGroups 저장
      if (activeStep === 2 && selectedRoundId) {
        if (!ensureProjectUnlocked()) return;
        await updateRoundConfig(
          selectedRoundId,
          {
            mapping,
            supportGroups,
            maxStepReached: 3,
          },
          projectToken
        );
      }

      // Step5 끝날 때: resultMapping 저장
      if (activeStep === 4 && selectedRoundId) {
        if (!ensureProjectUnlocked()) return;
        await updateRoundConfig(
          selectedRoundId,
          {
            mapping,
            supportGroups,
            resultMapping,
            maxStepReached: 5,
          },
          projectToken
        );
      }

      setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
    } catch (err) {
      console.error("handleNext save error:", err);
      // ✅ 토큰 만료 처리
      if (err?.response?.status === 401) {
        handleTokenExpired();
      } else {
        setRoundStatus("단계 저장 중 오류가 발생했습니다.");
      }
    } finally {
      setIsSaving(false);
    }
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

        {/* 프로젝트 / 전형 선택 바 */}
        <div style={projectBarStyle}>
          {/* 1행: 프로젝트 선택 + 새 프로젝트 생성 토글 */}
          <div style={projectRowStyle}>
            <span style={labelStyle}>프로젝트</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{
                ...inputStyle,
                minWidth: "220px",
              }}
            >
              <option value="">
                {loadingProjects
                  ? "프로젝트 불러오는 중..."
                  : "프로젝트 선택"}
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              style={ghostButtonStyle}
              onClick={() => setIsCreatingProject((prev) => !prev)}
            >
              {isCreatingProject ? "새 프로젝트 입력 닫기" : "새 프로젝트 생성"}
            </button>
          </div>

          {/* 새 프로젝트 입력 영역 */}
          {isCreatingProject && (
            <div
              style={{
                ...projectRowStyle,
                marginTop: "4px",
              }}
            >
              <input
                type="text"
                placeholder="프로젝트 이름"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                style={{ ...inputStyle, minWidth: "180px" }}
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={newProjectPassword}
                onChange={(e) => setNewProjectPassword(e.target.value)}
                style={{ ...inputStyle, minWidth: "140px" }}
              />
              <input
                type="text"
                placeholder="설명 (선택)"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                style={{ ...inputStyle, minWidth: "220px", flex: 1 }}
              />
              <button
                type="button"
                style={smallButtonStyle}
                onClick={handleCreateProject}
              >
                프로젝트 생성
              </button>
            </div>
          )}

          {/* 2행: 프로젝트 잠금 상태 */}
          <div style={projectRowStyle}>
            <span style={labelStyle}>잠금 상태</span>
            {selectedProjectId ? (
              projectToken ? (
                <span style={{ fontSize: "12px", color: "#2e7d32" }}>
                  🔓 잠금 해제됨
                </span>
              ) : (
                <>
                  <input
                    type="password"
                    placeholder="프로젝트 비밀번호"
                    value={projectPassword}
                    onChange={(e) => setProjectPassword(e.target.value)}
                    style={{ ...inputStyle, minWidth: "180px" }}
                  />
                  <button
                    type="button"
                    style={smallButtonStyle}
                    onClick={handleUnlockProject}
                  >
                    잠금 해제
                  </button>
                </>
              )
            ) : (
              <span style={{ fontSize: "12px", color: "#666" }}>
                프로젝트를 먼저 선택하거나 생성하세요.
              </span>
            )}
          </div>

          {/* ✅ 2.5행: 프로젝트명 수정 */}
          {selectedProjectId && projectToken && (
            <div style={projectRowStyle}>
              <span style={labelStyle}>프로젝트명 수정</span>
              <input
                type="text"
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                style={{ ...inputStyle, minWidth: "220px" }}
              />
              <button
                type="button"
                style={smallButtonStyle}
                onClick={handleUpdateProjectName}
              >
                저장
              </button>
            </div>
          )}

          {/* 3행: 전형 모드 탭 */}
          {selectedProjectId && (
            <div
              style={{
                ...projectRowStyle,
                marginTop: "4px",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  borderRadius: "999px",
                  border: "1px solid #c0c6d4",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setRoundMode("load")}
                  style={{
                    padding: "4px 10px",
                    fontSize: "12px",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor:
                      roundMode === "load" ? "#1976d2" : "transparent",
                    color: roundMode === "load" ? "#fff" : "#333",
                  }}
                >
                  불러오기
                </button>
                <button
                  type="button"
                  onClick={() => setRoundMode("new")}
                  style={{
                    padding: "4px 10px",
                    fontSize: "12px",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor:
                      roundMode === "new" ? "#1976d2" : "transparent",
                    color: roundMode === "new" ? "#fff" : "#333",
                  }}
                >
                  새로 만들기
                </button>
              </div>

              {roundMode === "new" && (
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    type="text"
                    placeholder="새 전형 이름"
                    value={newRoundName}
                    onChange={(e) => setNewRoundName(e.target.value)}
                    style={{ ...inputStyle, minWidth: "180px" }}
                  />
                  <button
                    type="button"
                    style={smallButtonStyle}
                    onClick={handleStartNewRound}
                  >
                    새 전형 시작
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ✅ 3.5행: 전형명 수정 */}
          {selectedProjectId && selectedRoundId && (
            <div
              style={{
                ...projectRowStyle,
                marginTop: "4px",
              }}
            >
              <span style={labelStyle}>전형명 수정</span>
              <input
                type="text"
                value={editRoundName}
                onChange={(e) => setEditRoundName(e.target.value)}
                style={{ ...inputStyle, minWidth: "220px" }}
              />
              <button
                type="button"
                style={smallButtonStyle}
                onClick={handleUpdateRoundName}
              >
                저장
              </button>
            </div>
          )}

          {/* 4행: 전형 목록 (불러오기 모드) */}
          {selectedProjectId && roundMode === "load" && (
            <div style={{ marginTop: "4px" }}>
              <div
                style={{
                  ...projectRowStyle,
                  marginBottom: "4px",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "12px", color: "#555" }}>
                  전형 목록
                  {loadingRounds && " · 불러오는 중..."}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  minHeight: "22px",
                }}
              >
                {rounds.length === 0 ? (
                  <span style={{ fontSize: "12px", color: "#888" }}>
                    {roundStatus || "등록된 전형이 없습니다."}
                  </span>
                ) : (
                  rounds.map((r) => (
                    <div
                      key={r.id}
                      style={roundBadgeStyle(selectedRoundId === r.id)}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenRound(r)}
                        style={{
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          margin: 0,
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        {r.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRound(r)}
                        style={roundDeleteButtonStyle}
                        title="전형 삭제"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 상태 메시지 */}
          {(projectStatus || roundStatus) && (
            <div style={{ marginTop: "4px", fontSize: "11px", color: "#555" }}>
              {projectStatus && <div>• {projectStatus}</div>}
              {roundStatus && <div>• {roundStatus}</div>}
            </div>
          )}
        </div>

        {/* Step Indicator */}
        <div style={stepHeaderStyle}>
          {steps.map((label, idx) => (
            <div key={label} style={stepItemStyle(idx === activeStep)}>
              {idx + 1}. {label}
            </div>
          ))}
        </div>

        {/* 메인 카드 */}
        <div
          style={{
            borderRadius: "12px",
            backgroundColor: "#fff",
            padding: "20px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          }}
        >
          {activeStep === 0 && <Step1Upload onParsed={handleExcelParsed} />}
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
            disabled={activeStep === 0 || isSaving}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              backgroundColor: "#fff",
              cursor:
                activeStep === 0 || isSaving ? "not-allowed" : "pointer",
              opacity: activeStep === 0 || isSaving ? 0.5 : 1,
            }}
          >
            이전
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext() || isSaving}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              border: "1px solid #1976d2",
              backgroundColor:
                canGoNext() && !isSaving ? "#1976d2" : "#90caf9",
              color: "#fff",
              cursor:
                canGoNext() && !isSaving ? "pointer" : "not-allowed",
            }}
          >
            {activeStep === steps.length - 1 ? "완료" : "다음"}
          </button>
        </div>
      </div>
    </div>

  );
}
