// src/pages/ReportEditorPage.js
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import {
  getRoundCalc,
  listRoundReports,
  createRoundReport,
  updateRoundReport,
} from "../services/evalRoundService";
import ReportPreviewModal from "../components/report/ReportPreviewModal";
import OverallSummarySection from "../components/materials/OverallSummarySection";
import OverallSummaryConfigModal from "../components/materials/OverallSummaryConfigModal"; 
// 💡 GroupSection 관련 컴포넌트 추가
import GroupSection from "../components/materials/GroupSection"; 
import GroupConfigModal from "../components/materials/GroupConfigModal"; 

// Draft.js
import { Editor, EditorState, ContentState } from "draft-js";
import "draft-js/dist/Draft.css";

const BASE_PAGE_WIDTH = 794;
const BASE_PAGE_HEIGHT = 1123;

let pageIdSeq = 1;

/**
 * 페이지 하나당 사용하는 텍스트 에디터 (Block 용도)
 * - content: plain text
 */
function PageTextEditor({ page, onChange }) {
  const [editorState, setEditorState] = useState(() => {
    const content = ContentState.createFromText(page.text || "");
    return EditorState.createWithContent(content);
  });

  const didMountRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    // 외부에서 page.text가 변경되었을 때 에디터 상태를 업데이트
    const content = ContentState.createFromText(page.text || "");
    setEditorState(EditorState.createWithContent(content));
  }, [page.text]);

  const handleChange = (nextEditorState) => {
    setEditorState(nextEditorState);
    const text = nextEditorState.getCurrentContent().getPlainText("\n");
    onChange(text);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        // 페이지 마진은 부모 컨테이너에서 처리하므로 여기서 패딩 제거
        padding: "0", 
        boxSizing: "border-box",
        fontSize: "12px",
        lineHeight: 1.6,
        fontFamily:
          '"Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", sans-serif',
      }}
    >
      <Editor editorState={editorState} onChange={handleChange} />
    </div>
  );
}

function ReportEditorPage() {
  const { roundId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { projectId, projectName, round, projectToken } = location.state || {};

  // Step6 계산 결과
  const [calc, setCalc] = useState(null);
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [calcError, setCalcError] = useState("");

  // 에디터 상태: 페이지 = 블록 배열
  const [pageScale, setPageScale] = useState(100);
  const [pageMargin, setPageMargin] = useState(48);
  const [pages, setPages] = useState(() => {
    const firstPageId = `page-${pageIdSeq++}`;
    return [
      {
        id: firstPageId,
        blocks: [
          // 기본 텍스트 블록
          { id: `block-${pageIdSeq++}`, type: 'text', text: '' },
        ],
      },
    ];
  });

  // 리포트 저장/로드
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [currentReportId, setCurrentReportId] = useState(null);

  // 자동 저장 관련
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const autoSaveTimerRef = useRef(null);

  // 미리보기
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // 좌측 팔레트 호버 상태 (JSON 말풍선)
  const [hoveredPaletteId, setHoveredPaletteId] = useState(null);

  // 섹션 설정 모달 관련 상태
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  // 편집 중인 블록의 위치 { pageId, blockId }
  const [editingBlockLocation, setEditingBlockLocation] = useState(null); 
  // 모달에 넘길 현재 설정 객체 (blockType 필드를 추가하여 어떤 모달을 띄울지 구분)
  const [configToEdit, setConfigToEdit] = useState({}); 

  // 기본 방어
  useEffect(() => {
    if (!projectToken || !projectId) {
      setCalcError(
        "프로젝트 토큰 정보가 없습니다. 보고서 만들기 화면에서 다시 진입해 주세요."
      );
    }
  }, [projectToken, projectId]);

  // Step6 계산 불러오기
  useEffect(() => {
    if (!roundId || !projectToken) return;

    const load = async () => {
      try {
        setLoadingCalc(true);
        const data = await getRoundCalc(roundId, projectToken);
        setCalc(data.calc || null);
        setCalcError("");
      } catch (err) {
        console.error("getRoundCalc error:", err);
        setCalcError("Step6 계산 결과를 불러오지 못했습니다.");
      } finally {
        setLoadingCalc(false);
      }
    };

    load();
  }, [roundId, projectToken]);

  // Step6 통계에서 지원분야 이름
  const crossGroupSummary = useMemo(
    () => calc?.stats?.crossGroupSummary || [],
    [calc]
  );

  const groupNames = useMemo(
    () => crossGroupSummary.map((r) => r.groupName).filter(Boolean),
    [crossGroupSummary]
  );

  // 좌측 팔레트 (Step6 분석 재료 목록)
  const paletteItems = useMemo(() => {
    // ... (paletteItems 정의는 변경 없음)
    const overview = [
      {
        id: "overview-cross-summary",
        label: "지원분야 간 요약 비교 (Step6 전체 개요)",
        kind: "overview",
        sectionKey: "crossGroupSummary",
        sectionType: "표",
      },
    ];

    const perGroupSections = [
      { key: "summary", label: "요약 통계 (총점 기준)", sectionType: "표" },
      {
        key: "phase-total-avg",
        label: "전형 결과별 합/불 총점 평균",
        sectionType: "데이터",
      },
      {
        key: "field-stats",
        label: "평가항목별 합/불 평균 및 합격 공헌도",
        sectionType: "데이터",
      },
      {
        key: "final-compare",
        label: "채용 결과별 총점 비교",
        sectionType: "데이터",
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

    return { overview, groups };
  }, [groupNames]);
  
  // 블록 데이터 업데이트 (텍스트 블록/섹션 config 등)
  const handleUpdateBlockData = (pageId, blockId, newData) => {
    setPages((prev) =>
        prev.map((p) =>
            p.id === pageId
                ? {
                      ...p,
                      blocks: p.blocks.map((b) =>
                          b.id === blockId ? { ...b, ...newData } : b
                      ),
                  }
                : p
        )
    );
  };
  
  // 텍스트 블록 내용 변경 핸들러
  const handleChangePageText = (pageId, blockId, newText) => {
    handleUpdateBlockData(pageId, blockId, { text: newText });
  };
  
  // 블록 제거 핸들러
  const handleRemoveBlock = (pageId, blockId) => {
    setPages((prev) =>
        prev.map((p) => {
            if (p.id !== pageId) return p;
            
            let updatedBlocks = p.blocks.filter((b) => b.id !== blockId);
            
            // 페이지에 블록이 하나도 남지 않으면 최소한 텍스트 블록 하나를 유지
            if (updatedBlocks.length === 0) {
                updatedBlocks = [{ id: `block-${pageIdSeq++}`, type: 'text', text: '' }];
            }
            
            return { ...p, blocks: updatedBlocks };
        })
    );
  };

  // 섹션 설정 모달 열기 핸들러
  const handleOpenConfigModal = (pageId, blockId, currentConfig) => {
    setEditingBlockLocation({ pageId, blockId });
    // currentConfig는 이제 blockType 필드를 포함해야 합니다.
    setConfigToEdit(currentConfig); 
    setIsConfigModalOpen(true);
  };

  // 섹션 설정 저장 핸들러 (Generalised)
  const handleSaveSectionConfig = (newConfig) => {
    if (!editingBlockLocation) {
        setIsConfigModalOpen(false);
        return;
    }
    
    // 모달이 열릴 때 저장된 blockType을 사용합니다.
    const blockType = configToEdit.blockType; 
    if (!blockType) {
         setIsConfigModalOpen(false);
         return;
    }
    
    const { pageId, blockId } = editingBlockLocation;
    
    // newConfig에서 모달을 구분하기 위해 사용했던 blockType은 제거하고 실제 config만 저장합니다.
    // GroupConfigModal에서 groupName을 initialConfig로 받으므로, configToSave에는 포함되어야 합니다.
    const { blockType: _, ...configToSave } = newConfig;

    // 페이지 상태 내의 해당 블록 config 업데이트
    setPages((prev) => 
        prev.map(p => 
            p.id === pageId 
                ? { 
                    ...p, 
                    blocks: p.blocks.map(b => 
                        b.id === blockId && b.type === blockType
                            ? { ...b, data: { ...b.data, config: configToSave } } 
                            : b
                    ) 
                  } 
                : p
        )
    );

    setEditingBlockLocation(null);
    setConfigToEdit({});
    setIsConfigModalOpen(false);
  }

  // OverallSummarySection 호출 핸들러 (첫 페이지에 블록 삽입)
  const handleCallOverallSection = () => {
    if (!crossGroupSummary || crossGroupSummary.length === 0) {
        return;
    }

    const newBlockId = `section-overall-${new Date().getTime()}`;
    const newBlock = {
        id: newBlockId,
        type: 'overall_summary',
        data: {
            config: {
                sectionScale: 100,
                // titlePlain의 기본값은 calc?.name || headerTitle
            }
        }
    };

    let insertedPageId = null;

    setPages((prevPages) => {
        if (prevPages.length === 0) return prevPages;

        const firstPage = prevPages[0];
        const updatedFirstPage = {
            ...firstPage,
            // 새 블록을 첫 번째 페이지의 가장 위에 삽입
            blocks: [newBlock, ...firstPage.blocks]
        };
        insertedPageId = firstPage.id;

        return [updatedFirstPage, ...prevPages.slice(1)];
    });
    
    if(insertedPageId) {
        // 삽입 후 설정 모달 열기
        handleOpenConfigModal(insertedPageId, newBlockId, {
            ...newBlock.data.config,
            // 모달 렌더링을 위해 blockType을 함께 전달
            blockType: newBlock.type, 
        });
    }
  };

  // GroupSection 호출 핸들러 (첫 페이지에 블록 삽입) 💡 새로 추가된 기능
  const handleCallGroupSection = (groupName) => {
    // 해당 그룹의 데이터가 없거나, 그룹 이름이 없으면 삽입 방지
    if (!groupName || !calc?.stats?.perGroup?.[groupName]) {
        return;
    }

    const newBlockId = `section-group-${groupName}-${new Date().getTime()}`;
    // GroupConfigModal에서 필요한 초기 설정 (groupName은 필수)
    const initialGroupConfig = {
        groupName: groupName,
        sectionScale: 100,
    };

    const newBlock = {
        id: newBlockId,
        type: 'group_section',
        data: {
            config: initialGroupConfig
        }
    };

    let insertedPageId = null;

    setPages((prevPages) => {
        if (prevPages.length === 0) return prevPages;

        const firstPage = prevPages[0];
        const updatedFirstPage = {
            ...firstPage,
            // 새 블록을 첫 번째 페이지의 가장 위에 삽입
            blocks: [newBlock, ...firstPage.blocks]
        };
        insertedPageId = firstPage.id;

        return [updatedFirstPage, ...prevPages.slice(1)];
    });
    
    if(insertedPageId) {
        // 삽입 후 설정 모달 열기
        handleOpenConfigModal(insertedPageId, newBlockId, {
            ...newBlock.data.config,
            // 모달 렌더링을 위해 blockType을 함께 전달
            blockType: newBlock.type, 
        });
    }
  };


  const scaledWidth = (BASE_PAGE_WIDTH * pageScale) / 100;
  const scaledHeight = (BASE_PAGE_HEIGHT * pageScale) / 100;

  const handleChangePageScale = (e) => {
    const value = Number(e.target.value);
    if (!Number.isFinite(value)) return;
    setPageScale(value);
  };

  const handleChangePageMargin = (e) => {
    const value = Number(e.target.value);
    if (!Number.isFinite(value)) return;
    const clamped = Math.min(80, Math.max(24, value));
    setPageMargin(clamped);
  };

  const handleAddPage = () => {
    const newPageId = `page-${pageIdSeq++}`;
    setPages((prev) => [
      ...prev,
      {
        id: newPageId,
        blocks: [{ id: `block-${pageIdSeq++}`, type: 'text', text: '' }],
      },
    ]);
  };

  const handleRemovePage = (pageId) => {
    setPages((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((p) => p.id !== pageId);
    });
  };

  const handleBackToList = () => {
    navigate("/reports");
  };

  const headerTitle = round?.name || (roundId ? `전형 #${roundId}` : "전형");

  // Draft 저장 (V2 스키마)
  const handleSaveDraft = async () => {
    if (!projectToken || !roundId) return;

    // 저장 시에는 pages 배열의 모든 블록 정보를 포함
    const payload = {
      schema_version: "editor-v2", // 스키마 버전 업데이트
      round_id: Number(roundId),
      project_id: projectId || null,
      name: headerTitle,
      report: {
        pages: pages.map((p) => ({
          id: p.id,
          blocks: p.blocks.map(b => {
            if (b.type === 'text') {
              // 텍스트 블록은 id, type, text만 저장
              return { id: b.id, type: b.type, text: (b.text || "").trimEnd() };
            }
            if (b.type === 'overall_summary') {
              // 섹션 블록은 id, type, config만 저장
              return { id: b.id, type: b.type, config: b.data.config };
            }
            // 💡 Group Section 저장 로직 추가
            if (b.type === 'group_section') {
                return { id: b.id, type: b.type, config: b.data.config };
            }
            return null; 
          }).filter(Boolean)
        })),
        pageScale,
        pageMargin,
      },
    };

    try {
      setIsSaving(true);
      setDraftError("");

      let res;
      if (currentReportId) {
        res = await updateRoundReport(
          roundId,
          currentReportId,
          payload,
          projectToken
        );
      } else {
        res = await createRoundReport(roundId, payload, projectToken);
        const created = res?.report;
        if (created?.id) setCurrentReportId(created.id);
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

      if (status === 404) {
        setDraftError(
          "보고서를 찾을 수 없습니다. 새로고침 후 다시 시도해 주세요."
        );
      } else if (status === 401) {
        setDraftError("권한이 없습니다. 프로젝트 다시 입장 후 시도해 주세요.");
      } else {
        setDraftError("보고서 저장 중 오류가 발생했습니다.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const scheduleAutoSave = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveDraft();
    }, 3000);
  };

  useEffect(() => {
    // 저장 대상이 되는 상태 변경 시 자동 저장 스케줄링
    if (!currentReportId) return;
    // 전체 페이지/블록 구조가 변경될 때마다 저장 스케줄링
    scheduleAutoSave(); 
  }, [pages, pageScale, pageMargin]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Draft 로드 (V2 스키마 우선)
  useEffect(() => {
    const loadDraft = async () => {
      if (!roundId || !projectToken) return;

      try {
        setLoadingDraft(true);
        setDraftError("");

        const data = await listRoundReports(roundId, projectToken);
        const reports = data?.reports || [];
        
        // V2 스키마 우선 로드 (블록 구조)
        const latest = reports.find(r => r.schema_version === 'editor-v2');

        if (!latest) return; // V2 스키마가 없으면 로드하지 않음

        const report = latest.report || {};
        const {
          pages: savedPages,
          pageScale: savedScale,
          pageMargin: savedMargin,
        } = report;

        if (Array.isArray(savedPages) && savedPages.length > 0) {
          const mappedPages = savedPages.map((p) => {
            const blocks = (p.blocks || []).map(b => {
              if (b.type === 'text') {
                return { id: b.id || `block-${pageIdSeq++}`, type: 'text', text: b.text || '' };
              }
              if (b.type === 'overall_summary') {
                // 섹션 블록은 config를 data.config로 매핑하여 로드
                return { 
                    id: b.id || `block-${pageIdSeq++}`, 
                    type: 'overall_summary', 
                    data: { config: b.config || {} }
                };
              }
              // 💡 Group Section 로드 로직 추가
              if (b.type === 'group_section') {
                return { 
                    id: b.id || `block-${pageIdSeq++}`, 
                    type: 'group_section', 
                    data: { config: b.config || {} }
                };
              }
              return null;
            }).filter(Boolean);
            
            // 페이지가 비어 있으면 최소한 텍스트 블록 하나 추가 (편집 가능하도록)
            if (blocks.length === 0) {
                 blocks.push({ id: `block-${pageIdSeq++}`, type: 'text', text: '' });
            }
            
            return {
                id: p.id || `page-${pageIdSeq++}`,
                blocks: blocks,
            };
          });
          setPages(mappedPages);
        }

        if (typeof savedScale === "number") setPageScale(savedScale);
        if (typeof savedMargin === "number") setPageMargin(savedMargin);
        if (latest.id) setCurrentReportId(latest.id);

        setLastSavedAt(
          latest.generated_at || latest.updated_at || new Date().toISOString()
        );
      } catch (err) {
        console.error("loadDraft error:", err);
        setDraftError("기존 초안을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoadingDraft(false);
      }
    };

    loadDraft();
  }, [roundId, projectToken]);

  const getSectionJsonPreview = (item) => {
    // ... (JSON Preview 로직 변경 없음)
    if (!calc?.stats) return "통계 데이터가 없습니다.";

    try {
      if (item.kind === "overview") {
        if (item.sectionKey === "crossGroupSummary") {
          return JSON.stringify(
            {
              section: "crossGroupSummary",
              rows: calc.stats.crossGroupSummary || [],
            },
            null,
            2
          );
        }
      }

      if (item.kind === "group") {
        const perGroup = calc.stats.perGroup || {};
        const groupStats = perGroup[item.groupName];
        if (!groupStats) {
          return `${item.groupName}에 대한 통계가 없습니다.`;
        }

        if (item.sectionKey === "summary") {
          return JSON.stringify(
            {
              section: "summaryStats",
              groupName: item.groupName,
              summaryStats: groupStats.summaryStats,
            },
            null,
            2
          );
        }

        if (item.sectionKey === "phase-total-avg") {
          return JSON.stringify(
            {
              section: "phaseTotalAvgData",
              groupName: item.groupName,
              phaseTotalAvgData: groupStats.phaseTotalAvgData,
            },
            null,
            2
          );
        }

        if (item.sectionKey === "field-stats") {
          return JSON.stringify(
            {
              section: "fieldStats",
              groupName: item.groupName,
              fieldStats: groupStats.fieldStats,
            },
            null,
            2
          );
        }

        if (item.sectionKey === "final-compare") {
          return JSON.stringify(
            {
              section: "finalCompareData",
              groupName: item.groupName,
              finalCompareData: groupStats.finalCompareData,
            },
            null,
            2
          );
        }
      }

      return "미리보기가 정의되지 않은 섹션입니다.";
    } catch (e) {
      console.error("getSectionJsonPreview error:", e);
      return "미리보기 생성 중 오류가 발생했습니다.";
    }
  };

  return (
    <div
      style={{
        padding: "16px 16px 32px",
        maxWidth: "1800px",
        margin: "0 auto",
      }}
    >
      {/* 상단 헤더 (변경 없음) */}
      {/* ... (Header code) ... */}
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
            }}
          >
            <button
              type="button"
              onClick={handleBackToList}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "999px",
                fontSize: "11px",
                color: "#4b5563",
              }}
            >
              ← 목록으로
            </button>
            <h1
              style={{
                fontSize: "18px",
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
            <div
              style={{
                fontSize: "11px",
                color: "#6b7280",
              }}
            >
              마지막 저장:{" "}
              <span style={{ fontWeight: 500 }}>
                {new Date(lastSavedAt).toLocaleString("ko-KR")}
              </span>
            </div>
          )}
          {draftError && (
            <div
              style={{
                fontSize: "11px",
                color: "#b91c1c",
                backgroundColor: "#fee2e2",
                padding: "4px 8px",
                borderRadius: "999px",
                border: "1px solid #fecaca",
              }}
            >
              {draftError}
            </div>
          )}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            style={{
              padding: "6px 12px",
              borderRadius: "999px",
              border: "1px solid #4b5563",
              backgroundColor: isSaving ? "#e5e7eb" : "#111827",
              color: isSaving ? "#6b7280" : "#f9fafb",
              fontSize: "12px",
              cursor: isSaving ? "default" : "pointer",
            }}
          >
            {isSaving ? "저장 중..." : "💾 저장"}
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


      {/* 페이지 설정 (변경 없음) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "12px",
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
            max={80}
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

      {/* 좌 / 가운데 / 우 레이아웃 (3열) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 340px) minmax(0, 1fr) 300px", // 3열 레이아웃 유지
          gap: "16px",
          alignItems: "flex-start",
        }}
      >
        {/* 좌측: Step6 분석 재료 */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            backgroundColor: "#f9fafb",
            padding: "10px",
            fontSize: "11px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              marginBottom: "4px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "18px",
                height: "18px",
                borderRadius: "999px",
                backgroundColor: "#111827",
                color: "#f9fafb",
                fontSize: "10px",
              }}
            >
              1
            </span>
            📂 Step6 분석 재료
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#6b7280",
              marginBottom: "8px",
            }}
          >
            각 재료에 마우스를 올리면, 해당 섹션에 대응하는 Step6 통계 JSON 일부가
            말풍선으로 표시됩니다.{" "}
            <span style={{ color: "#374151" }}>
              (지금은 그래프/표 렌더링 없이 데이터만 참고용으로 제공)
            </span>
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
            {paletteItems.overview.map((item) => {
              const isHovered = hoveredPaletteId === item.id;
              const jsonText = isHovered ? getSectionJsonPreview(item) : "";

              return (
                <div
                  key={item.id}
                  style={{
                    position: "relative",
                    fontSize: "11px",
                    padding: "6px 8px",
                    borderRadius: "999px",
                    border: "1px solid #d1d5db",
                    backgroundColor: "#f3f4f6",
                    cursor: "default",
                    marginBottom: "4px",
                  }}
                  onMouseEnter={() => setHoveredPaletteId(item.id)}
                  onMouseLeave={() => setHoveredPaletteId(null)}
                >
                  {item.label}
                  {isHovered && (
                    <div
                      style={{
                        position: "absolute",
                        top: "110%",
                        left: 0,
                        zIndex: 20,
                        maxWidth: "380px",
                        maxHeight: "260px",
                        padding: "8px",
                        backgroundColor: "#111827",
                        color: "#e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                        fontSize: "10px",
                        overflow: "auto",
                        whiteSpace: "pre",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "-6px",
                          left: "12px",
                          width: 0,
                          height: 0,
                          borderLeft: "6px solid transparent",
                          borderRight: "6px solid transparent",
                          borderBottom: "6px solid #111827",
                        }}
                      />
                      <pre
                        style={{
                          margin: 0,
                          fontFamily:
                            '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        }}
                      >
                        {jsonText || "데이터 없음"}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={handleCallOverallSection} // 첫 페이지에 블록 삽입
              style={{
                marginTop: "6px",
                padding: "4px 8px",
                borderRadius: "999px",
                border: "1px solid #2563eb",
                backgroundColor: "#2563eb",
                color: "#fff",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              전체개요 섹션 삽입
            </button>
          </div>

          {/* 지원분야별 상세 */}
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
                }}
              >
                지원분야 통계가 없습니다.
              </div>
            )}
            {groupNames.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
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
                      {group.items.map((item) => {
                        const isHovered = hoveredPaletteId === item.id;
                        const jsonText = isHovered
                          ? getSectionJsonPreview(item)
                          : "";

                        return (
                          <div
                            key={item.id}
                            style={{
                              position: "relative",
                              fontSize: "11px",
                              padding: "4px 8px",
                              borderRadius: "999px",
                              border: "1px solid #d1d5db",
                              backgroundColor: "#f9fafb",
                              cursor: "default",
                            }}
                            onMouseEnter={() => setHoveredPaletteId(item.id)}
                            onMouseLeave={() => setHoveredPaletteId(null)}
                          >
                            {item.label}
                            {isHovered && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "110%",
                                  left: 0,
                                  zIndex: 20,
                                  maxWidth: "380px",
                                  maxHeight: "260px",
                                  padding: "8px",
                                  backgroundColor: "#111827",
                                  color: "#e5e7eb",
                                  borderRadius: "8px",
                                  boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                                  fontSize: "10px",
                                  overflow: "auto",
                                  whiteSpace: "pre",
                                }}
                              >
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "-6px",
                                    left: "12px",
                                    width: 0,
                                    height: 0,
                                    borderLeft:
                                      "6px solid transparent",
                                    borderRight:
                                      "6px solid transparent",
                                    borderBottom:
                                      "6px solid #111827",
                                  }}
                                />
                                <pre
                                  style={{
                                    margin: 0,
                                    fontFamily:
                                      '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                  }}
                                >
                                  {jsonText || "데이터 없음"}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {/* 💡 Group Section 삽입 버튼 추가 */}
                      <button
                        type="button"
                        onClick={() => handleCallGroupSection(group.groupName)}
                        style={{
                            marginTop: "6px",
                            padding: "4px 8px",
                            borderRadius: "999px",
                            border: "1px solid #2563eb",
                            backgroundColor: "#2563eb",
                            color: "#fff",
                            fontSize: "11px",
                            cursor: "pointer",
                        }}
                      >
                        {group.groupName} 섹션 삽입
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 가운데: 페이지 에디터 (블록 렌더링) */}
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
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <span>페이지 {pageIndex + 1}</span>
                  {pages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePage(page.id)}
                      style={{
                        border: "none",
                        padding: "2px 6px",
                        borderRadius: "999px",
                        borderColor: "#fca5a5",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        fontSize: "10px",
                        backgroundColor: "#fee2e2",
                        cursor: "pointer",
                        color: "#b91c1c",
                      }}
                    >
                      ✕ 페이지 삭제
                    </button>
                  )}
                </div>
                {/* 페이지 컨테이너: 블록 흐름 영역 */}
                <div
                  style={{
                    width: `${scaledWidth}px`,
                    height: `${scaledHeight}px`,
                    backgroundColor: "#fff",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    borderRadius: "4px",
                    boxSizing: "content-box",
                    position: "relative",
                    overflow: "auto", // 페이지 내용이 넘칠 경우 스크롤 허용
                  }}
                >
                  {/* 블록 렌더링 영역: 여기에 페이지 여백 적용 */}
                  <div
                    style={{
                      position: "relative",
                      padding: `${pageMargin}px`, // 페이지 여백
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: "24px", // 블록 간 간격
                      boxSizing: 'border-box',
                      minHeight: "100%",
                    }}
                  >
                    {/* 블록 순회 및 렌더링 */}
                    {page.blocks.map((block, blockIndex) => {
                      if (block.type === 'text') {
                        return (
                          <div 
                            key={block.id} 
                            style={{ 
                                // 텍스트 블록은 공간을 채우도록 flex-grow 1 적용 가능
                                // 그러나 드래그앤드롭이 구현되지 않은 현 단계에서는 고정 높이 또는 min-height로 처리
                                minHeight: '100px', 
                                flexGrow: 1,
                                border: '1px dashed #e5e7eb', // 텍스트 블록 시각화
                                padding: '12px 16px', // 텍스트 에디터 내부 패딩
                            }}
                          >
                            <PageTextEditor
                              page={{ text: block.text }} 
                              onChange={(text) =>
                                handleChangePageText(page.id, block.id, text)
                              }
                            />
                          </div>
                        );
                      }
                      
                      if (block.type === 'overall_summary') {
                        return (
                          <div key={block.id} style={{ position: 'relative' }}>
                            {/* 블록 제거 버튼 */}
                            <button
                                type="button"
                                onClick={() => handleRemoveBlock(page.id, block.id)}
                                style={{
                                    position: "absolute",
                                    top: "-15px",
                                    right: "0px",
                                    zIndex: 10,
                                    border: "1px solid #fca5a5",
                                    padding: "2px 6px",
                                    borderRadius: "999px",
                                    fontSize: "10px",
                                    backgroundColor: "#fee2e2",
                                    cursor: "pointer",
                                    color: "#b91c1c",
                                }}
                            >
                                ✕ 섹션 제거
                            </button>
                            
                            <OverallSummarySection
                              roundName={calc?.name || headerTitle}
                              rows={crossGroupSummary}
                              config={block.data.config}
                              // 섹션 텍스트/캡션 변경 시 바로 data.config 업데이트
                              onChangeConfig={(newConfig) => handleUpdateBlockData(page.id, block.id, { data: { ...block.data, config: newConfig }})}
                              // 섹션 설정 버튼 클릭 시 모달 열기
                              onEditClick={() => handleOpenConfigModal(page.id, block.id, {
                                  ...block.data.config,
                                  blockType: block.type // 💡 모달 구분을 위해 blockType 추가
                              })}
                            />
                          </div>
                        );
                      }
                      
                      // 💡 GroupSection 렌더링 로직 추가
                      if (block.type === 'group_section') {
                          const groupName = block.data.config?.groupName;
                          const groupData = calc?.stats?.perGroup?.[groupName] || {};
                          
                          // 해당 그룹의 통계 데이터가 없거나, 그룹 이름이 없으면 렌더링하지 않음
                          if (!groupName || Object.keys(groupData).length === 0) {
                              return (
                                  <div key={block.id} style={{ border: '1px dashed #ef4444', padding: '12px', color: '#dc2626', backgroundColor: '#fecaca', fontSize: '11px' }}>
                                      {groupName ? `[${groupName}] 통계 데이터가 없습니다.` : "그룹 섹션: 그룹 이름이 설정되지 않았습니다."}
                                      <button 
                                          onClick={() => handleRemoveBlock(page.id, block.id)} 
                                          style={{ marginLeft: '10px', fontSize: '10px', border: 'none', background: 'none', color: '#991b1b', cursor: 'pointer' }}>
                                          (삭제)
                                      </button>
                                  </div>
                              );
                          }

                          return (
                              <div key={block.id} style={{ position: 'relative' }}>
                                  {/* 블록 제거 버튼 */}
                                  <button
                                      type="button"
                                      onClick={() => handleRemoveBlock(page.id, block.id)}
                                      style={{
                                          position: "absolute",
                                          top: "-15px",
                                          right: "0px",
                                          zIndex: 10,
                                          border: "1px solid #fca5a5",
                                          padding: "2px 6px",
                                          borderRadius: "999px",
                                          fontSize: "10px",
                                          backgroundColor: "#fee2e2",
                                          cursor: "pointer",
                                          color: "#b91c1c",
                                      }}
                                  >
                                      ✕ 섹션 제거
                                  </button>
                                  
                                  <GroupSection
                                      groupName={groupName}
                                      groupData={groupData}
                                      config={block.data.config}
                                      // 섹션 텍스트/캡션 변경 시 바로 data.config 업데이트
                                      onChangeConfig={(newConfig) => handleUpdateBlockData(page.id, block.id, { data: { ...block.data, config: newConfig }})}
                                      // 섹션 설정 버튼 클릭 시 모달 열기
                                      onEditClick={() => handleOpenConfigModal(page.id, block.id, {
                                          ...block.data.config,
                                          blockType: block.type // 💡 모달 구분을 위해 blockType 추가
                                      })}
                                  />
                              </div>
                          );
                      }
                      
                      return null;
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 우측: 설정 패널 (변경 없음) */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            backgroundColor: "#fff",
            padding: "10px",
            fontSize: "11px",
            color: "#9ca3af",
            minHeight: "400px",
          }}
        >
          {/* 여기에 향후 다른 컴포넌트의 설정 UI가 위치하게 됩니다. */}
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              marginBottom: "8px",
              color: "#4b5563",
            }}
          >
            ⚙️ 컴포넌트 설정 패널
          </div>
          <div>
            (각 섹션 컴포넌트의 '⚙️ 설정' 버튼을 눌러 설정을 변경하세요.)
          </div>
        </div>
      </div>

      {/* OverallSummaryConfigModal 렌더링 */}
      {editingBlockLocation?.blockId && isConfigModalOpen && configToEdit.blockType === 'overall_summary' && (
        <OverallSummaryConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            initialConfig={configToEdit}
            roundName={calc?.name || headerTitle}
            onSave={handleSaveSectionConfig}
        />
      )}

      {/* 💡 GroupConfigModal 렌더링 */}
      {editingBlockLocation?.blockId && isConfigModalOpen && configToEdit.blockType === 'group_section' && (
        <GroupConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            initialConfig={configToEdit}
            groupName={configToEdit.groupName} // GroupConfigModal에 groupName 전달
            onSave={handleSaveSectionConfig}
        />
      )}

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

export default ReportEditorPage;