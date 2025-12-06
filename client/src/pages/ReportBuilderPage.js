// src/pages/ReportBuilderPage.js
import React, { useEffect, useState } from "react";
import {
  listProjects,
  unlockProject,
  getProjectToken,
  saveProjectToken,
  removeProjectToken,
} from "../services/projectService";
import {
  listRoundsByProject,
  listRoundReports,
} from "../services/evalRoundService";
import { useNavigate } from "react-router-dom";

const pageContainerStyle = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "24px 16px 40px",
};

const sectionTitleStyle = {
  fontSize: "20px",
  fontWeight: 700,
  marginBottom: "12px",
};

const projectCardStyle = {
  border: "1px solid ",
  borderRadius: "12px",
  marginBottom: "12px",
  backgroundColor: "#f9fafc",
  overflow: "hidden",
};

const projectHeaderStyle = (opened) => ({
  padding: "10px 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  cursor: "pointer",
  backgroundColor: opened ? "#e3f2fd" : "#f9fafc",
  borderBottom: opened ? "1px solid #d0d7e2" : "1px solid #e5e7eb",
});

const tagStyle = (type = "default") => {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: "999px",
    fontSize: "11px",
    border: "1px solid transparent",
  };
  if (type === "locked") {
    return {
      ...base,
      borderColor: "#fca5a5",
      backgroundColor: "#fef2f2",
      color: "#b91c1c",
    };
  }
  if (type === "unlocked") {
    return {
      ...base,
      borderColor: "#93c5fd",
      backgroundColor: "#eff6ff",
      color: "#1d4ed8",
    };
  }
  if (type === "meta") {
    return {
      ...base,
      borderColor: "#e5e7eb",
      backgroundColor: "#f9fafb",
      color: "#4b5563",
    };
  }
  return base;
};

const smallButtonStyle = {
  padding: "4px 8px",
  borderRadius: "999px",
  border: "1px solid #4b5563",
  backgroundColor: "#fff",
  fontSize: "11px",
  cursor: "pointer",
};

const textInputStyle = {
  padding: "6px 8px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "13px",
  width: "160px",
};

export default function ReportBuilderPage() {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [openProjectId, setOpenProjectId] = useState(null);

  // 프로젝트별 토큰, 패스워드 인풋, 상태 메시지, 전형 목록
  const [projectTokens, setProjectTokens] = useState({});
  const [passwordInputs, setPasswordInputs] = useState({});
  const [statusByProject, setStatusByProject] = useState({});
  const [roundsByProject, setRoundsByProject] = useState({});
  const [loadingRoundsProjectId, setLoadingRoundsProjectId] = useState(null);

  // 전형별 리포트 메타 (에디터 초안 여부 + 최근 작성 시각)
  // { [roundId]: { hasEditorDraft: boolean, lastEditedAt: string | null } }
  const [roundReportMeta, setRoundReportMeta] = useState({});

  const navigate = useNavigate();

  // 프로젝트 목록 로딩
  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const list = await listProjects();
      const safeList = list || [];
      setProjects(safeList);

      // 로컬스토리지에 저장된 토큰 복원
      const tokenMap = {};
      safeList.forEach((p) => {
        const token = getProjectToken(p.id);
        if (token) {
          tokenMap[p.id] = token;
        }
      });
      setProjectTokens(tokenMap);

      // 토큰 있는 프로젝트는 전형 목록도 미리 시도해서 불러오기
      safeList.forEach((p) => {
        const token = getProjectToken(p.id);
        if (token) {
          loadRoundsForProject(p.id, token, { silent: true });
        }
      });
    } catch (err) {
      console.error("loadProjects error:", err);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const setProjectStatus = (projectId, message) => {
    setStatusByProject((prev) => ({
      ...prev,
      [projectId]: message,
    }));
  };

  const handlePasswordChange = (projectId) => (e) => {
    const value = e.target.value;
    setPasswordInputs((prev) => ({
      ...prev,
      [projectId]: value,
    }));
  };

  // 특정 프로젝트의 전형 목록 + 각 전형의 에디터 리포트 메타 조회
  const loadRoundsForProject = async (
    projectId,
    token,
    { silent = false } = {}
  ) => {
    if (!projectId || !token) return;
    try {
      if (!silent) {
        setLoadingRoundsProjectId(projectId);
        setProjectStatus(projectId, "전형 목록 불러오는 중...");
      }
      const list = await listRoundsByProject(projectId, token);
      const safeRounds = list || [];

      setRoundsByProject((prev) => ({
        ...prev,
        [projectId]: safeRounds,
      }));

      if (!silent) {
        setProjectStatus(
          projectId,
          safeRounds.length ? "" : "등록된 전형이 없습니다."
        );
      }

      // 각 전형에 대해 editor-v1 리포트 여부/최근 작성시각 조회
      const metaUpdates = {};
      for (const round of safeRounds) {
        try {
          const res = await listRoundReports(round.id, token);
          const reports = res?.reports || [];
          // createdAt DESC 정렬되어 있으므로 앞쪽이 최신
          const editorReports = reports.filter(
            (r) => r.schema_version === "editor-v1"
          );
          if (editorReports.length > 0) {
            const latest = editorReports[0];
            const tsISO =
              latest.generated_at ||
              latest.updated_at ||
              latest.created_at ||
              null;
            metaUpdates[round.id] = {
              hasEditorDraft: true,
              lastEditedAt: tsISO,
            };
          } else {
            metaUpdates[round.id] = {
              hasEditorDraft: false,
              lastEditedAt: null,
            };
          }
        } catch (err) {
          console.error(
            "loadRoundsForProject > listRoundReports error:",
            err
          );
          // 실패 시 해당 전형 메타는 건드리지 않음
        }
      }
      if (Object.keys(metaUpdates).length > 0) {
        setRoundReportMeta((prev) => ({
          ...prev,
          ...metaUpdates,
        }));
      }
    } catch (err) {
      console.error("loadRoundsForProject error:", err);
      if (err?.response?.status === 401) {
        // 토큰 만료 → 로컬/상태에서 제거 후 다시 비번 입력 요구
        removeProjectToken(projectId);
        setProjectTokens((prev) => {
          const next = { ...prev };
          delete next[projectId];
          return next;
        });
        setRoundsByProject((prev) => {
          const next = { ...prev };
          delete next[projectId];
          return next;
        });
        setProjectStatus(
          projectId,
          "프로젝트 토큰이 만료되었습니다. 비밀번호를 다시 입력해 잠금을 해제하세요."
        );
      } else {
        setProjectStatus(
          projectId,
          "전형 목록 조회 중 오류가 발생했습니다."
        );
      }
    } finally {
      if (!silent) {
        setLoadingRoundsProjectId(null);
      }
    }
  };

  const handleUnlock = async (projectId) => {
    const password = (passwordInputs[projectId] || "").trim();
    if (!password) {
      setProjectStatus(projectId, "비밀번호를 입력하세요.");
      return;
    }
    try {
      setProjectStatus(projectId, "프로젝트 잠금 해제 중...");
      const { token } = await unlockProject(projectId, password);
      saveProjectToken(projectId, token);
      setProjectTokens((prev) => ({
        ...prev,
        [projectId]: token,
      }));
      setProjectStatus(projectId, "프로젝트 잠금 해제됨");
      await loadRoundsForProject(projectId, token);
    } catch (err) {
      console.error("handleUnlock error:", err);
      if (err?.response?.status === 401) {
        setProjectStatus(projectId, "비밀번호가 올바르지 않습니다.");
      } else {
        setProjectStatus(projectId, "잠금 해제 중 오류가 발생했습니다.");
      }
    }
  };

  const handleRelock = (projectId) => {
    // 토큰 제거 후, 전형 목록도 숨김
    removeProjectToken(projectId);
    setProjectTokens((prev) => {
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
    setRoundsByProject((prev) => {
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
    setProjectStatus(projectId, "프로젝트가 다시 잠겼습니다.");
  };

  const toggleAccordion = (projectId) => {
    setOpenProjectId((prev) => (prev === projectId ? null : projectId));
  };

  // 한국시간 포맷터
  const formatKoreanDateTime = (isoString) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={pageContainerStyle}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "4px" }}>
        보고서 만들기
      </h1>
      <p style={{ fontSize: "13px", color: "#4b5563", marginBottom: "16px" }}>
        프로젝트별로 전형 목록을 확인하고, 이후 GPT 보고서 페이지로 확장할
        기반 화면입니다. 비밀번호로 잠금을 해제해야 전형 목록이 보입니다.
      </p>

      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
          fontSize: "12px",
        }}
      >
        <div>
          <span style={{ fontWeight: 600 }}>프로젝트 목록</span>{" "}
          {loadingProjects && (
            <span style={{ color: "#6b7280", marginLeft: "6px" }}>
              (불러오는 중...)
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={loadProjects}
          style={{
            padding: "4px 10px",
            borderRadius: "999px",
            border: "1px solid #d1d5db",
            backgroundColor: "#fff",
            fontSize: "11px",
            cursor: "pointer",
          }}
        >
          🔄 새로고침
        </button>
      </div>

      {(!projects || projects.length === 0) && !loadingProjects && (
        <div
          style={{
            fontSize: "13px",
            color: "#6b7280",
            border: "1px dashed #d1d5db",
            borderRadius: "8px",
            padding: "10px 12px",
          }}
        >
          등록된 프로젝트가 없습니다. 먼저 &quot;그래프 만들기&quot; 화면에서
          프로젝트를 생성해 주세요.
        </div>
      )}

      <div>
        {projects.map((project) => {
          const opened = openProjectId === project.id;
          const token = projectTokens[project.id];
          const rounds = roundsByProject[project.id] || [];
          const statusText = statusByProject[project.id] || "";
          const isLoadingRounds = loadingRoundsProjectId === project.id;

          return (
            <div key={project.id} style={projectCardStyle}>
              {/* 헤더 (아코디언 버튼) */}
              <div
                style={projectHeaderStyle(opened)}
                onClick={() => toggleAccordion(project.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                      }}
                    >
                      {project.name || `프로젝트 #${project.id}`}
                    </span>
                    <span style={tagStyle(token ? "unlocked" : "locked")}>
                      {token ? "🔓 잠금 해제됨" : "🔒 잠금 필요"}
                    </span>
                  </div>
                  {project.description && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                      }}
                    >
                      {project.description}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "12px",
                    color: "#6b7280",
                  }}
                >
                  <span>{opened ? "▴" : "▾"}</span>
                </div>
              </div>

              {/* 바디 (열렸을 때만) */}
              {opened && (
                <div style={{ padding: "10px 14px", backgroundColor: "#fff" }}>
                  {/* 비밀번호 / 잠금 상태 영역 */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        minWidth: "70px",
                      }}
                    >
                      프로젝트 잠금
                    </span>

                    {!token ? (
                      <>
                        <input
                          type="password"
                          placeholder="비밀번호"
                          value={passwordInputs[project.id] || ""}
                          onChange={handlePasswordChange(project.id)}
                          style={textInputStyle}
                        />
                        <button
                          type="button"
                          onClick={() => handleUnlock(project.id)}
                          style={{
                            ...smallButtonStyle,
                            borderColor: "#2563eb",
                            color: "#fff",
                            backgroundColor: "#2563eb",
                          }}
                        >
                          잠금 해제
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: "12px", color: "#166534" }}>
                          이 프로젝트는 현재 잠금 해제된 상태입니다.
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRelock(project.id)}
                          style={{
                            ...smallButtonStyle,
                            borderColor: "#9ca3af",
                            color: "#4b5563",
                          }}
                        >
                          다시 잠그기
                        </button>
                      </>
                    )}
                  </div>

                  {statusText && (
                    <div
                      style={{
                        marginBottom: "8px",
                        fontSize: "12px",
                        color: "#6b7280",
                      }}
                    >
                      {statusText}
                    </div>
                  )}

                  {/* 전형 목록 */}
                  <div
                    style={{
                      marginTop: "4px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space_between",
                        marginBottom: "6px",
                      }}
                    >
                      <span style={sectionTitleStyle}>
                        전형 목록
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 400,
                            marginLeft: "4px",
                            color: "#6b7280",
                          }}
                        >
                          (보고서 대상 선택용)
                        </span>
                      </span>
                      {token && (
                        <button
                          type="button"
                          onClick={() =>
                            loadRoundsForProject(project.id, token)
                          }
                          style={{
                            ...smallButtonStyle,
                            borderColor: "#d1d5db",
                          }}
                        >
                          🔄 전형 새로고침
                        </button>
                      )}
                    </div>

                    {!token && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#9ca3af",
                          border: "1px dashed #e5e7eb",
                          borderRadius: "8px",
                          padding: "8px 10px",
                        }}
                      >
                        전형 목록을 보려면 먼저 위에서 비밀번호를 입력해
                        프로젝트 잠금을 해제해주세요.
                      </div>
                    )}

                    {token && isLoadingRounds && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          padding: "6px 0",
                        }}
                      >
                        전형 목록을 불러오는 중입니다...
                      </div>
                    )}

                    {token && !isLoadingRounds && rounds.length === 0 && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#9ca3af",
                          border: "1px dashed #e5e7eb",
                          borderRadius: "8px",
                          padding: "8px 10px",
                        }}
                      >
                        이 프로젝트에는 아직 등록된 전형이 없습니다. 먼저
                        &quot;그래프 만들기&quot;에서 전형을 생성해 주세요.
                      </div>
                    )}

                    {token && !isLoadingRounds && rounds.length > 0 && (
                      <div
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          overflow: "hidden",
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "12px",
                          }}
                        >
                          <thead>
                            <tr
                              style={{
                                backgroundColor: "#f3f4f6",
                              }}
                            >
                              <th
                                style={{
                                  textAlign: "left",
                                  padding: "6px 8px",
                                  borderBottom: "1px solid #e5e7eb",
                                }}
                              >
                                전형명
                              </th>
                              <th
                                style={{
                                  textAlign: "center",
                                  padding: "6px 8px",
                                  borderBottom: "1px solid #e5e7eb",
                                  width: "90px",
                                }}
                              >
                                상태
                              </th>
                              <th
                                style={{
                                  textAlign: "center",
                                  padding: "6px 8px",
                                  borderBottom: "1px solid #e5e7eb",
                                  width: "80px",
                                }}
                              >
                                진행 단계
                              </th>
                              <th
                                style={{
                                  textAlign: "center",
                                  padding: "6px 8px",
                                  borderBottom: "1px solid #e5e7eb",
                                  width: "160px",
                                }}
                              >
                                보고서 액션
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rounds.map((round) => {
                              const meta = roundReportMeta[round.id] || {};
                              const hasDraft = !!meta.hasEditorDraft;
                              const lastEditedAt = meta.lastEditedAt;
                              const buttonLabel = hasDraft
                                ? "이어서 만들기"
                                : "보고서 만들기";

                              return (
                                <tr key={round.id}>
                                  <td
                                    style={{
                                      padding: "6px 8px",
                                      borderBottom: "1px solid #f3f4f6",
                                    }}
                                  >
                                    {round.name || `전형 #${round.id}`}
                                  </td>
                                  <td
                                    style={{
                                      padding: "6px 8px",
                                      borderBottom: "1px solid #f3f4f6",
                                      textAlign: "center",
                                    }}
                                  >
                                    <span style={tagStyle("meta")}>
                                      {round.status || "미정"}
                                    </span>
                                  </td>
                                  <td
                                    style={{
                                      padding: "6px 8px",
                                      borderBottom: "1px solid #f3f4f6",
                                      textAlign: "center",
                                    }}
                                  >
                                    {round.max_step_reached != null
                                      ? `${round.max_step_reached}단계`
                                      : "-"}
                                  </td>
                                  <td
                                    style={{
                                      padding: "6px 8px",
                                      borderBottom: "1px solid #f3f4f6",
                                      textAlign: "center",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                    >
                                      <button
                                        type="button"
                                        style={{
                                          ...smallButtonStyle,
                                          borderColor: "#2563eb",
                                          color: "#2563eb",
                                          backgroundColor: "#eff6ff",
                                        }}
                                        onClick={() => {
                                          if (!token) {
                                            alert(
                                              "프로젝트 토큰이 없습니다. 다시 잠금 해제 후 시도해 주세요."
                                            );
                                            return;
                                          }
                                          navigate(
                                            `/report-editor/${round.id}`,
                                            {
                                              state: {
                                                projectId: project.id,
                                                projectName: project.name,
                                                round,
                                                projectToken: token,
                                              },
                                            }
                                          );
                                        }}
                                      >
                                        {buttonLabel}
                                      </button>
                                      {hasDraft && lastEditedAt && (
                                        <div
                                          style={{
                                            fontSize: "11px",
                                            color: "#6b7280",
                                          }}
                                        >
                                          최근 작성:{" "}
                                          {formatKoreanDateTime(
                                            lastEditedAt
                                          )}
                                        </div>
                                      )}
                                      {!hasDraft && (
                                        <div
                                          style={{
                                            fontSize: "11px",
                                            color: "#9ca3af",
                                          }}
                                        >
                                          작성 중인 보고서 없음
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
