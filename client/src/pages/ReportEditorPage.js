// src/pages/ReportEditorPage.js
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import {
  getRoundCalc,
  listRoundReports,
  createRoundReport,
  updateRoundReport,
} from "../services/evalRoundService";
import ReportPreviewModal from "../components/report/ReportPreviewModal";

// HWP 같은 페이지 느낌을 위한 기본 A4 비율
const BASE_PAGE_WIDTH = 794; // px
const BASE_PAGE_HEIGHT = 1123; // px

function createPage(id) {
  return {
    id,
    blocks: [],
  };
}

let pageIdSeq = 1;
let blockIdSeq = 1;

export default function ReportEditorPage() {
  const { roundId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { projectId, projectName, round, projectToken } = location.state || {};

  // Step6 계산 결과
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [calcError, setCalcError] = useState("");
  const [calc, setCalc] = useState(null);

  // 에디터 상태
  const [pageScale, setPageScale] = useState(100); // %
  const [pageMargin, setPageMargin] = useState(48); // px
  const [pages, setPages] = useState([createPage(`page-${pageIdSeq++}`)]);

  // 리포트 저장/로드 관련
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [currentReportId, setCurrentReportId] = useState(null); // editor 전용 EvalRoundReport.id

  // 미리보기
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // 기본 방어: 직접 URL 치고 들어왔는데 state 없음
  useEffect(() => {
    if (!projectToken || !projectId) {
      setCalcError(
        "프로젝트 토큰 정보가 없습니다. 보고서 만들기 화면에서 다시 진입해 주세요."
      );
    }
  }, [projectToken, projectId]);

  // Step6 계산 결과 불러오기
  useEffect(() => {
    const shouldLoad =
      roundId && projectToken && !loadingCalc && !calc && !calcError;

    if (!shouldLoad) return;

    const load = async () => {
      try {
        setLoadingCalc(true);
        const data = await getRoundCalc(roundId, projectToken);
        if (!data || !data.calc) {
          setCalcError(
            "이 전형에 저장된 Step6 계산 결과가 없습니다. 먼저 그래프 만들기 6단계에서 계산을 저장해 주세요."
          );
          return;
        }
        setCalc(data.calc);
      } catch (err) {
        console.error("ReportEditorPage getRoundCalc error:", err);
        const status = err?.response?.status;
        if (status === 404) {
          setCalcError(
            "이 전형에 저장된 Step6 계산 결과가 없습니다. 먼저 그래프 만들기 6단계에서 계산을 저장해 주세요."
          );
        } else if (status === 401) {
          setCalcError(
            "프로젝트 토큰이 만료되었습니다. 보고서 만들기 화면에서 다시 잠금을 해제해 주세요."
          );
        } else {
          setCalcError("Step6 계산 결과를 불러오는 중 오류가 발생했습니다.");
        }
      } finally {
        setLoadingCalc(false);
      }
    };

    load();
  }, [roundId, projectToken, loadingCalc, calc, calcError]);

  // 기존 "에디터용" 리포트 불러오기 (schema_version === "editor-v1")
  useEffect(() => {
    if (!roundId || !projectToken) return;

    const loadDraft = async () => {
      try {
        setLoadingDraft(true);
        setDraftError("");

        const data = await listRoundReports(roundId, projectToken);
        const reports = data?.reports || [];

        // createdAt DESC라 앞에 있을수록 최신
        const editorReports = reports.filter(
          (r) => r.schema_version === "editor-v1"
        );

        if (editorReports.length === 0) return;

        const latest = editorReports[0];

        const report = latest.report || {};
        const {
          pages: savedPages,
          pageScale: savedScale,
          pageMargin: savedMargin,
          baseWidth,
          baseHeight,
        } = report;

        if (Array.isArray(savedPages) && savedPages.length > 0) {
          setPages(savedPages);
        }
        if (typeof savedScale === "number") setPageScale(savedScale);
        if (typeof savedMargin === "number") setPageMargin(savedMargin);
        // baseWidth/baseHeight는 지금 상수와 사실상 동일할 거라 별도 처리 X

        setCurrentReportId(latest.id);
        setLastSavedAt(
          latest.generated_at || latest.updated_at || new Date().toISOString()
        );
      } catch (err) {
        console.error("loadDraft error:", err);
        const status = err?.response?.status;
        if (status === 401) {
          setDraftError(
            "프로젝트 토큰이 만료되었습니다. 보고서 만들기 화면에서 다시 잠금을 해제해 주세요."
          );
        } else {
          setDraftError(
            "기존 보고서 초안을 불러오는 중 오류가 발생했습니다."
          );
        }
      } finally {
        setLoadingDraft(false);
      }
    };

    loadDraft();
  }, [roundId, projectToken]);

  // Step6 통계에서 지원분야 이름 리스트 추출 (crossGroupSummary 기준)
  const groupNames = useMemo(() => {
    const rows = calc?.stats?.crossGroupSummary || [];
    return rows.map((r) => r.groupName).filter(Boolean);
  }, [calc]);

  // 좌측 재료 패널에서 사용할 "섹션 카탈로그"
  const paletteItems = useMemo(() => {
    const overview = [
      {
        id: "overview-cross-summary",
        label: "지원분야 간 요약 비교 (Step6 전체 개요)",
        kind: "overview",
        sectionType: "표",
      },
    ];

    const perGroupSections = [
      {
        key: "summary",
        label: "요약 통계 (총점 기준)",
        sectionType: "표",
      },
      {
        key: "phase-total-avg",
        label: "전형 결과별 합/불 총점 평균",
        sectionType: "그래프",
      },
      {
        key: "field-stats",
        label: "평가항목별 합/불 평균 및 합격 공헌도(상관계수)",
        sectionType: "표+그래프",
      },
      {
        key: "final-compare",
        label: "채용 결과별 총점 비교",
        sectionType: "그래프",
      },
    ];

    const groups = groupNames.map((name) => ({
      groupName: name,
      items: perGroupSections.map((sec) => ({
        id: `group-${name}-${sec.key}`,
        label: sec.label,
        kind: "group",
        groupName: name,
        sectionKey: sec.key,
        sectionType: sec.sectionType,
      })),
    }));

    return {
      overview,
      groups,
    };
  }, [groupNames]);

  const scaledWidth = (BASE_PAGE_WIDTH * pageScale) / 100;
  const scaledHeight = (BASE_PAGE_HEIGHT * pageScale) / 100;

  const handleChangePageScale = (e) => {
    const value = Number(e.target.value);
    if (!Number.isFinite(value)) return;
    const clamped = Math.min(140, Math.max(60, value));
    setPageScale(clamped);
  };

  const handleChangePageMargin = (e) => {
    const value = Number(e.target.value);
    if (!Number.isFinite(value)) return;
    const clamped = Math.min(96, Math.max(24, value));
    setPageMargin(clamped);
  };

  const handleAddPage = () => {
    setPages((prev) => [...prev, createPage(`page-${pageIdSeq++}`)]);
  };

  const handleAddTextBlock = (pageId) => {
    const newBlock = {
      id: `block-${blockIdSeq++}`,
      type: "text",
      title: "텍스트 블록",
      content: "",
    };
    setPages((prev) =>
      prev.map((p) =>
        p.id === pageId ? { ...p, blocks: [...p.blocks, newBlock] } : p
      )
    );
  };

  const handleDragStartFromPalette = (item) => (e) => {
    e.dataTransfer.effectAllowed = "copy";
    const payload = {
      type: "step6-section",
      sectionId: item.id,
      label: item.label,
      kind: item.kind,
      groupName: item.groupName || null,
      sectionKey: item.sectionKey || null,
      sectionType: item.sectionType || null,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
  };

  const handlePageDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handlePageDrop = (pageId) => (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    if (payload.type === "step6-section") {
      const newBlock = {
        id: `block-${blockIdSeq++}`,
        type: "step6-section",
        title: payload.label || "Step6 섹션",
        meta: {
          sectionId: payload.sectionId,
          kind: payload.kind,
          groupName: payload.groupName,
          sectionKey: payload.sectionKey,
          sectionType: payload.sectionType,
        },
        content: "",
      };
      setPages((prev) =>
        prev.map((p) =>
          p.id === pageId ? { ...p, blocks: [...p.blocks, newBlock] } : p
        )
      );
    }
  };

  const handleChangeBlockContent = (pageId, blockId, nextContent) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === pageId
          ? {
              ...p,
              blocks: p.blocks.map((b) =>
                b.id === blockId ? { ...b, content: nextContent } : b
              ),
            }
          : p
      )
    );
  };

  const handleRemoveBlock = (pageId, blockId) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === pageId
          ? {
              ...p,
              blocks: p.blocks.filter((b) => b.id !== blockId),
            }
          : p
      )
    );
  };

  const handleBackToList = () => {
    // 너가 바꿔둔 경로 반영
    navigate("/reports");
  };

  const headerTitle =
    round?.name || (roundId ? `전형 #${roundId}` : "전형");

  const handleSaveDraft = async () => {
    if (!roundId || !projectToken) return;

    try {
      setSavingDraft(true);
      setDraftError("");

      const payload = {
        name:
          headerTitle && typeof headerTitle === "string"
            ? headerTitle
            : "보고서 에디터 초안",
        report: {
          pages,
          pageScale,
          pageMargin,
          baseWidth: BASE_PAGE_WIDTH,
          baseHeight: BASE_PAGE_HEIGHT,
        },
        schema_version: "editor-v1",
      };

      let res;
      if (currentReportId) {
        // 기존 editor-v1 리포트 전체 갈아끼우기
        res = await updateRoundReport(
          roundId,
          currentReportId,
          payload,
          projectToken
        );
      } else {
        // 최초 저장: 새 리포트 생성
        res = await createRoundReport(roundId, payload, projectToken);
        const created = res?.report;
        if (created?.id) {
          setCurrentReportId(created.id);
        }
      }

      const savedReport = res?.report;
      setLastSavedAt(
        savedReport?.generated_at ||
          savedReport?.updated_at ||
          new Date().toISOString()
      );
    } catch (err) {
      console.error("handleSaveDraft error:", err);
      const status = err?.response?.status;
      if (status === 401) {
        setDraftError(
          "프로젝트 토큰이 만료되었습니다. 보고서 만들기 화면에서 다시 잠금을 해제해 주세요."
        );
      } else {
        setDraftError("보고서 초안을 저장하는 중 오류가 발생했습니다.");
      }
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div
      style={{
        padding: "16px 16px 32px",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      {/* 상단 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <button
              type="button"
              onClick={handleBackToList}
              style={{
                padding: "4px 8px",
                borderRadius: "999px",
                border: "1px solid #d1d5db",
                fontSize: "11px",
                backgroundColor: "#fff",
                cursor: "pointer",
              }}
            >
              ⬅ 보고서 목록으로
            </button>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 700,
                margin: 0,
              }}
            >
              보고서 에디터
            </h1>
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            <span style={{ fontWeight: 600 }}>
              {projectName || `프로젝트 #${projectId || "-"}`}
            </span>
            {" · "}
            <span>{headerTitle}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {lastSavedAt && (
            <span style={{ fontSize: "11px", color: "#6b7280" }}>
              마지막 저장: {new Date(lastSavedAt).toLocaleString()}
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft}
            style={{
              padding: "6px 10px",
              borderRadius: "999px",
              border: "1px solid #4b5563",
              backgroundColor: savingDraft ? "#e5e7eb" : "#fff",
              color: "#111827",
              fontSize: "12px",
              cursor: savingDraft ? "default" : "pointer",
            }}
          >
            {savingDraft ? "저장 중..." : "💾 저장"}
          </button>
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            style={{
              padding: "6px 12px",
              borderRadius: "999px",
              border: "1px solid #2563eb",
              backgroundColor: "#2563eb",
              color: "#fff",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            🔍 미리보기
          </button>
        </div>
      </div>

      {/* 에러/로딩 상태 */}
      <div
        style={{ fontSize: "12px", minHeight: "18px", marginBottom: "4px" }}
      >
        {loadingCalc && (
          <span style={{ color: "#6b7280", marginRight: 8 }}>
            Step6 계산 결과를 불러오는 중입니다...
          </span>
        )}
        {loadingDraft && (
          <span style={{ color: "#6b7280", marginRight: 8 }}>
            기존 보고서 초안을 불러오는 중입니다...
          </span>
        )}
        {!loadingCalc && calcError && (
          <span style={{ color: "#b91c1c", marginRight: 8 }}>{calcError}</span>
        )}
        {!loadingDraft && draftError && (
          <span style={{ color: "#b91c1c" }}>{draftError}</span>
        )}
      </div>

      {/* 페이지 설정 (전역) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          fontSize: "12px",
          padding: "8px 10px",
          borderRadius: "10px",
          border: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
          marginBottom: "12px",
        }}
      >
        <div style={{ fontWeight: 600 }}>페이지 설정</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>크기</span>
          <input
            type="range"
            min={60}
            max={140}
            value={pageScale}
            onChange={handleChangePageScale}
          />
          <span
            style={{
              padding: "2px 6px",
              borderRadius: "999px",
              border: "1px solid #d1d5db",
              backgroundColor: "#fff",
            }}
          >
            {pageScale}%
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>여백</span>
          <input
            type="range"
            min={24}
            max={96}
            value={pageMargin}
            onChange={handleChangePageMargin}
          />
          <span
            style={{
              padding: "2px 6px",
              borderRadius: "999px",
              border: "1px solid #d1d5db",
              backgroundColor: "#fff",
            }}
          >
            {pageMargin}px
          </span>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button
            type="button"
            onClick={handleAddPage}
            style={{
              padding: "4px 10px",
              borderRadius: "999px",
              border: "1px solid #4b5563",
              backgroundColor: "#fff",
              cursor: "pointer",
              fontSize: "11px",
            }}
          >
            ➕ 페이지 추가
          </button>
        </div>
      </div>

      {/* 좌/우 2열 레이아웃 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 340px) minmax(0, 1fr)",
          gap: "16px",
          alignItems: "flex-start",
        }}
      >
        {/* 좌측: Step6 재료 패널 */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            backgroundColor: "#f9fafb",
            padding: "10px",
            maxHeight: "calc(100vh - 180px)",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            📂 Step6 분석 재료
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#6b7280",
              marginBottom: "8px",
            }}
          >
            좌측의 표·그래프 설명을 마우스로 끌어다 우측 페이지로 드롭하면
            보고서에 삽입됩니다.
          </div>

          {/* 전체 개요 */}
          <div
            style={{
              marginBottom: "10px",
              padding: "8px",
              borderRadius: "8px",
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                marginBottom: "4px",
              }}
            >
              전체 개요
            </div>
            {paletteItems.overview.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={handleDragStartFromPalette(item)}
                style={{
                  fontSize: "11px",
                  padding: "6px 8px",
                  borderRadius: "999px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#f3f4f6",
                  cursor: "grab",
                  marginBottom: "4px",
                }}
              >
                {item.label}
              </div>
            ))}
          </div>

          {/* 지원분야별 섹션 */}
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                marginBottom: "4px",
              }}
            >
              지원분야별 상세 재료
            </div>
            {groupNames.length === 0 && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#9ca3af",
                  padding: "6px 4px",
                }}
              >
                저장된 Step6 통계에서 지원분야 정보를 찾을 수 없습니다.
              </div>
            )}
            {paletteItems.groups.map((group) => (
              <div
                key={group.groupName}
                style={{
                  marginBottom: "8px",
                  padding: "6px 8px",
                  borderRadius: "8px",
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    marginBottom: "4px",
                  }}
                >
                  {group.groupName}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={handleDragStartFromPalette(item)}
                      style={{
                        fontSize: "11px",
                        padding: "4px 8px",
                        borderRadius: "999px",
                        border: "1px solid #d1d5db",
                        backgroundColor: "#f9fafb",
                        cursor: "grab",
                      }}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 우측: HWP 스타일 페이지 에디터 */}
        <div
          style={{
            padding: "4px 0 16px",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {pages.map((page, pageIndex) => (
              <div
                key={page.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "#6b7280",
                  }}
                >
                  페이지 {pageIndex + 1}
                </div>
                <div
                  onDragOver={handlePageDragOver}
                  onDrop={handlePageDrop(page.id)}
                  style={{
                    width: `${scaledWidth}px`,
                    height: `${scaledHeight}px`,
                    backgroundColor: "#fff",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    borderRadius: "4px",
                    padding: `${pageMargin}px`,
                    overflowY: "auto",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      minHeight: "100%",
                      border: "1px dashed #e5e7eb",
                      padding: "8px 10px",
                      boxSizing: "border-box",
                    }}
                  >
                    {page.blocks.length === 0 && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#9ca3af",
                        }}
                      >
                        이 영역으로 Step6 재료를 드래그하거나, 아래에서 텍스트
                        블록을 추가해 보고서를 작성하세요.
                      </div>
                    )}
                    {page.blocks.map((block) => (
                      <div
                        key={block.id}
                        style={{
                          borderRadius: "6px",
                          border: "1px solid #e5e7eb",
                          padding: "6px 8px",
                          marginBottom: "8px",
                          backgroundColor:
                            block.type === "step6-section"
                              ? "#f9fafb"
                              : "#ffffff",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "4px",
                            gap: "6px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                            }}
                          >
                            {block.type === "step6-section"
                              ? block.title
                              : "텍스트"}
                            {block.meta?.groupName && (
                              <span
                                style={{
                                  marginLeft: "4px",
                                  fontWeight: 400,
                                  color: "#6b7280",
                                }}
                              >
                                · {block.meta.groupName}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveBlock(page.id, block.id)
                            }
                            style={{
                              border: "none",
                              background: "transparent",
                              fontSize: "12px",
                              color: "#9ca3af",
                              cursor: "pointer",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          style={{
                            fontSize: "12px",
                            minHeight: "40px",
                            outline: "none",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                          onInput={(e) =>
                            handleChangeBlockContent(
                              page.id,
                              block.id,
                              e.currentTarget.textContent || ""
                            )
                          }
                        >
                          {block.content ||
                            (block.type === "step6-section"
                              ? "이 표/그래프가 말해주는 인사이트를 자유롭게 서술해 주세요."
                              : "보고서 내용을 입력해 주세요.")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    marginTop: "4px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleAddTextBlock(page.id)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "999px",
                      border: "1px solid #4b5563",
                      backgroundColor: "#fff",
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    ➕ 텍스트 블록 추가
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 미리보기 모달 */}
      <ReportPreviewModal
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pages={pages}
        pageScale={pageScale}
        pageMargin={pageMargin}
        baseWidth={BASE_PAGE_WIDTH}
        baseHeight={BASE_PAGE_HEIGHT}
      />
    </div>
  );
}
