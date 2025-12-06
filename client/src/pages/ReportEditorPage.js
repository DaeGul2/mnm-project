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

// Draft.js
import { Editor, EditorState, ContentState } from "draft-js";
import "draft-js/dist/Draft.css";

// Recharts (Step6 그래프 복원용)
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";

const BASE_PAGE_WIDTH = 794;
const BASE_PAGE_HEIGHT = 1123;

const COLORS = {
  primary: "#1976d2",
  secondary: "#8b1a3d",
};

function formatLabelValue(value) {
  if (value == null) return "";
  return value.toFixed(1);
}

let pageIdSeq = 1;
let shapeIdSeq = 1;

/**
 * 페이지 하나당 사용하는 텍스트 에디터
 * - content: plain text
 * - blur 시 onChangeContent로 역전달
 * - 페이지 아무 데나 클릭해도 커서 찍히도록 wrapper에서 focus 처리
 */
function PageTextEditor({ content, onChangeContent }) {
  const [editorState, setEditorState] = useState(() =>
    EditorState.createWithContent(ContentState.createFromText(content || ""))
  );
  const editorRef = useRef(null);

  useEffect(() => {
    // content prop이 변경될 때만 editorState를 재설정 (Draft.js 최적화)
    const currentText = editorState.getCurrentContent().getPlainText("\n");
    if (currentText !== content) {
      setEditorState(
        EditorState.createWithContent(ContentState.createFromText(content || ""))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const handleChange = (state) => {
    setEditorState(state);
  };

  const handleBlur = () => {
    const plain = editorState.getCurrentContent().getPlainText("\n");
    onChangeContent(plain);
  };

  const handleWrapperClick = () => {
    if (editorRef.current && typeof editorRef.current.focus === "function") {
      editorRef.current.focus();
    }
  };

  return (
    <div
      style={{
        // minHeight: "100%", // Draft.js는 높이가 유동적이므로, 내부 컨테이너의 높이/패딩 조정이 필요
        height: "100%",
        cursor: "text",
        // 기존 padding: "4px 6px" 제거하고, 페이지의 여백 안에 텍스트가 들어가도록 설정
      }}
      onClick={handleWrapperClick}
      onBlur={handleBlur}
    >
      {/* Draft.js 에디터는 기본적으로 높이 제한이 없으며, Page Editor의 overflow: auto를 통해 스크롤됨 */}
      <Editor ref={editorRef} editorState={editorState} onChange={handleChange} />
    </div>
  );
}

export default function ReportEditorPage() {
  const { roundId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { projectId, projectName, round, projectToken } = location.state || {};

  // Step6 계산 결과
  const [calc, setCalc] = useState(null);
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [calcError, setCalcError] = useState("");

  // 에디터 상태: 페이지 = 텍스트 + 떠다니는 도형(shapes)
  const [pageScale, setPageScale] = useState(100);
  const [pageMargin, setPageMargin] = useState(48);
  const [pages, setPages] = useState(() => {
    const firstPageId = `page-${pageIdSeq++}`;
    return [
      {
        id: firstPageId,
        text: "",
        shapes: [], // {id, meta, x, y, width, height}
      },
    ];
  });

  // 리포트 저장/로드
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [currentReportId, setCurrentReportId] = useState(null);

  // 미리보기
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // 그래프/표 드래그 & 리사이즈 상태
  const [dragState, setDragState] = useState(null); // {pageId, shapeId, offsetXRatio, offsetYRatio}
  const [resizeState, setResizeState] = useState(null); // {pageId, shapeId, startX, startY, startWidth, startHeight}
  const pageRefs = useRef({});

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
  }, [roundId, projectToken]);

  // 기존 editor-v1 리포트 불러오기 (새 구조만 로드)
  useEffect(() => {
    if (!roundId || !projectToken) return;

    const loadDraft = async () => {
      try {
        setLoadingDraft(true);
        setDraftError("");

        const data = await listRoundReports(roundId, projectToken);
        const reports = data?.reports || [];
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
        } = report;

        if (
          Array.isArray(savedPages) &&
          savedPages.length > 0 &&
          savedPages[0] &&
          Object.prototype.hasOwnProperty.call(savedPages[0], "text")
        ) {
          setPages(savedPages);
        }

        if (typeof savedScale === "number") setPageScale(savedScale);
        if (typeof savedMargin === "number") setPageMargin(savedMargin);

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

  // Step6 통계에서 지원분야 이름
  const crossGroupSummary = useMemo(
    () => calc?.stats?.crossGroupSummary || [],
    [calc]
  );

  const groupNames = useMemo(
    () => crossGroupSummary.map((r) => r.groupName).filter(Boolean),
    [crossGroupSummary]
  );

  // 좌측 팔레트
  const paletteItems = useMemo(() => {
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
        label: "전형 결과별 합/불 총점 평균 (그래프)",
        sectionType: "그래프",
      },
      {
        key: "field-stats",
        label: "평가항목별 합/불 평균 및 합격 공헌도",
        sectionType: "표+그래프",
      },
      {
        key: "final-compare",
        label: "채용 결과별 총점 비교 (그래프)",
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

    return { overview, groups };
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
    const newPageId = `page-${pageIdSeq++}`;
    setPages((prev) => [
      ...prev,
      {
        id: newPageId,
        text: "",
        shapes: [],
      },
    ]);
  };

  // 페이지 삭제 기능 추가
  const handleRemovePage = (pageIdToRemove) => {
    if (pages.length <= 1) {
      alert("최소한 1개 이상의 페이지는 유지해야 합니다.");
      return;
    }

    setPages((prev) => prev.filter((p) => p.id !== pageIdToRemove));
  };

  const handleChangePageText = (pageId, nextText) => {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, text: nextText } : p))
    );
  };

  // 팔레트에서 드래그 시작
  const handleDragStartFromPalette = (item) => (e) => {
    e.dataTransfer.effectAllowed = "copy";
    const payload = {
      type: "step6-shape",
      meta: {
        sectionId: item.id,
        kind: item.kind,
        groupName: item.groupName || null,
        sectionKey: item.sectionKey || null,
        sectionType: item.sectionType || null,
        label: item.label,
      },
    };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
  };

  const handlePageDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  // 페이지에 드롭 → 해당 위치에 그래프/표 박스 생성
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
    if (payload.type !== "step6-shape") return;

    const pageEl = pageRefs.current[pageId];
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();

    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    const meta = payload.meta || {};

    // 여백 비율 계산
    const currentScaledWidth = pageEl.clientWidth;
    const currentScaledHeight = pageEl.clientHeight;
    const marginLeftRatio = pageMargin / currentScaledWidth;
    const marginTopRatio = pageMargin / currentScaledHeight;

    const newShape = {
      id: `shape-${shapeIdSeq++}`,
      meta,
      // 드롭 위치가 여백 내에 있도록 제한
      x: Math.min(1 - marginLeftRatio, Math.max(marginLeftRatio, xRatio)),
      y: Math.min(1 - marginTopRatio, Math.max(marginTopRatio, yRatio)),
      width: 320, // 초기 크기는 일단 고정
      height: 220,
    };

    setPages((prev) =>
      prev.map((p) =>
        p.id === pageId ? { ...p, shapes: [...p.shapes, newShape] } : p
      )
    );
  };

  // 그래프/표 박스 드래그 시작
  const handleShapeMouseDown = (pageId, shape, e) => {
    e.stopPropagation();
    e.preventDefault();

    const pageEl = pageRefs.current[pageId];
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();

    const pointerXRatio = (e.clientX - rect.left) / rect.width;
    const pointerYRatio = (e.clientY - rect.top) / rect.height;

    setDragState({
      pageId,
      shapeId: shape.id,
      offsetXRatio: pointerXRatio - shape.x,
      offsetYRatio: pointerYRatio - shape.y,
    });
    setResizeState(null);
  };

  // 리사이즈 시작 (오른쪽 아래 핸들)
  const handleResizeMouseDown = (pageId, shape, e) => {
    e.stopPropagation();
    e.preventDefault();
    setResizeState({
      pageId,
      shapeId: shape.id,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: shape.width,
      startHeight: shape.height,
    });
    setDragState(null);
  };

  // 전역 mousemove / mouseup 으로 드래그 & 리사이즈 처리
  useEffect(() => {
    if (!dragState && !resizeState) return;

    const handleMouseMove = (e) => {
      // 페이지 엘리먼트와 여백 비율을 가져오는 헬퍼 함수
      const getPageInfo = (pageId) => {
        const pageEl = pageRefs.current[pageId];
        if (!pageEl) return null;
        const rect = pageEl.getBoundingClientRect();
        const currentScaledWidth = pageEl.clientWidth;
        const currentScaledHeight = pageEl.clientHeight;
        const marginLeftRatio = pageMargin / currentScaledWidth;
        const marginTopRatio = pageMargin / currentScaledHeight;
        return { pageEl, rect, currentScaledWidth, currentScaledHeight, marginLeftRatio, marginTopRatio };
      };

      // 이동 (드래그)
      if (dragState) {
        const { pageId, shapeId, offsetXRatio, offsetYRatio } = dragState;
        const pageInfo = getPageInfo(pageId);
        if (!pageInfo) return;

        const { rect, marginLeftRatio, marginTopRatio } = pageInfo;
        const pointerXRatio = (e.clientX - rect.left) / rect.width;
        const pointerYRatio = (e.clientY - rect.top) / rect.height;

        let newX = pointerXRatio - offsetXRatio;
        let newY = pointerYRatio - offsetYRatio;

        // 여백 내부에만 있도록 제한
        const MIN_X = marginLeftRatio;
        const MAX_X = 1 - marginLeftRatio;
        const MIN_Y = marginTopRatio;
        const MAX_Y = 1 - marginTopRatio;

        newX = Math.min(MAX_X, Math.max(MIN_X, newX));
        newY = Math.min(MAX_Y, Math.max(MIN_Y, newY));

        setPages((prev) =>
          prev.map((p) => {
            if (p.id !== pageId) return p;
            return {
              ...p,
              shapes: p.shapes.map((s) =>
                s.id === shapeId ? { ...s, x: newX, y: newY } : s
              ),
            };
          })
        );
      }

      // 리사이즈
      if (resizeState) {
        const { pageId, shapeId, startX, startY, startWidth, startHeight } =
          resizeState;
        const pageInfo = getPageInfo(pageId);
        if (!pageInfo) return;

        const { currentScaledWidth, currentScaledHeight, marginLeftRatio, marginTopRatio } = pageInfo;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        setPages((prev) =>
          prev.map((p) => {
            if (p.id !== pageId) return p;
            
            const shape = p.shapes.find(s => s.id === shapeId);
            if (!shape) return p;

            // 새로운 크기 후보
            let newWidthCandidate = startWidth + dx;
            let newHeightCandidate = startHeight + dy;

            // 도형의 중심점 (x, y)
            const { x, y } = shape;

            // 최대 허용 크기 계산 (오른쪽/아래쪽 여백을 벗어나지 않도록)
            // 중심점(x)에서 오른쪽 여백 경계(1 - marginLeftRatio)까지의 거리 비율
            const maxRightBoundaryRatio = 1 - marginLeftRatio - x; 
            // 허용되는 최대 너비 (픽셀) = maxRightBoundaryRatio * 2 * currentScaledWidth
            const maxAvailableWidth = maxRightBoundaryRatio * 2 * currentScaledWidth;

            // 중심점(y)에서 아래쪽 여백 경계(1 - marginTopRatio)까지의 거리 비율
            const maxBottomBoundaryRatio = 1 - marginTopRatio - y;
            // 허용되는 최대 높이 (픽셀) = maxBottomBoundaryRatio * 2 * currentScaledHeight
            const maxAvailableHeight = maxBottomBoundaryRatio * 2 * currentScaledHeight;

            // 최소 크기 제한 (160, 120)과 최대 크기 제한을 적용
            const MIN_WIDTH = 160;
            const MIN_HEIGHT = 120;

            const newWidth = Math.min(
                maxAvailableWidth, 
                Math.max(MIN_WIDTH, newWidthCandidate)
            );
            const newHeight = Math.min(
                maxAvailableHeight, 
                Math.max(MIN_HEIGHT, newHeightCandidate)
            );

            return {
              ...p,
              shapes: p.shapes.map((s) =>
                s.id === shapeId
                  ? { ...s, width: newWidth, height: newHeight }
                  : s
              ),
            };
          })
        );
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
      setResizeState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, resizeState, pageMargin, pages]); // pageMargin과 pages를 의존성 배열에 추가

  const handleRemoveShape = (pageId, shapeId) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === pageId
          ? { ...p, shapes: p.shapes.filter((s) => s.id !== shapeId) }
          : p
      )
    );
  };

  const handleBackToList = () => {
    navigate("/reports");
  };

  const headerTitle = round?.name || (roundId ? `전형 #${roundId}` : "전형");

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
        res = await updateRoundReport(roundId, currentReportId, payload, projectToken);
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

  const formatKoreanDateTime = (isoString) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    } catch {
      return isoString;
    }
  };

  // Step6 표/그래프 실제 그리기
  const renderStep6SectionVisual = (meta) => {
    if (!calc || !calc.stats) {
      return (
        <div
          style={{
            fontSize: "11px",
            color: "#9ca3af",
            padding: "8px",
            border: "1px dashed#e5e7eb",
            borderRadius: "6px",
          }}
        >
          Step6 계산 결과를 불러오면 이 영역에 표/그래프가 표시됩니다.
        </div>
      );
    }

    const stats = calc.stats || {};
    const cross = stats.crossGroupSummary || [];
    const perGroup = stats.perGroup || {};

    // 전체 개요 표
    if (meta.kind === "overview" && meta.sectionKey === "crossGroupSummary") {
      if (!cross.length) {
        return (
          <div
            style={{
              fontSize: "11px",
              color: "#9ca3af",
              padding: "8px",
              border: "1px dashed #e5e7eb",
              borderRadius: "6px",
            }}
          >
            저장된 지원분야 요약 통계가 없습니다.
          </div>
        );
      }

      const headers = [
        "지원분야(통합)",
        "통계 대상 인원",
        "전형 합격률(%)",
        "총점 평균",
        "전형 합격 커트라인 점수",
        "합격컷 상위 %",
      ];

      return (
        <div
          style={{
            width: "100%",
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "11px",
            }}
          >
            <thead>
              <tr>
                {headers.map((label) => (
                  <th
                    key={label}
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                      padding: "4px 6px",
                      backgroundColor: "#f9fafb",
                      fontWeight: 600,
                      textAlign: "center",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cross.map((row) => (
                <tr key={row.groupName}>
                  <td
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      padding: "4px 6px",
                    }}
                  >
                    {row.groupName}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      padding: "4px 6px",
                      textAlign: "right",
                    }}
                  >
                    {row.n}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid#f3f4f6",
                      padding: "4px 6px",
                      textAlign: "right",
                    }}
                  >
                    {row.passRate != null ? row.passRate.toFixed(1) : "-"}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid#f3f4f6",
                      padding: "4px 6px",
                      textAlign: "right",
                    }}
                  >
                    {row.avgTotal != null ? row.avgTotal.toFixed(2) : "-"}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid#f3f4f6",
                      padding: "4px 6px",
                      textAlign: "right",
                    }}
                  >
                    {row.cutoff != null ? row.cutoff.toFixed(2) : "-"}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid#f3f4f6",
                      padding: "4px 6px",
                      textAlign: "right",
                    }}
                  >
                    {row.cutoffPercent != null
                      ? row.cutoffPercent.toFixed(1)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // 그룹별 요약
    if (meta.kind === "group" && meta.sectionKey === "summary") {
      const row = cross.find((r) => r.groupName === meta.groupName);
      if (!row) {
        return (
          <div
            style={{
              fontSize: "11px",
              color: "#9ca3af",
              padding: "8px",
              border: "1px dashed #e5e7eb",
              borderRadius: "6px",
            }}
          >
            이 지원분야에 대한 저장된 요약 통계를 찾을 수 없습니다.
          </div>
        );
      }

      const rows = [
        { label: "통계 대상 인원", value: row.n },
        {
          label: "전형 합격률(%)",
          value: row.passRate != null ? `${row.passRate.toFixed(1)}%` : "-",
        },
        {
          label: "총점 평균",
          value: row.avgTotal != null ? row.avgTotal.toFixed(2) : "-",
        },
        {
          label: "전형 합격 커트라인 점수",
          value: row.cutoff != null ? row.cutoff.toFixed(2) : "-",
        },
        {
          label: "합격컷 상위 %",
          value:
            row.cutoffPercent != null
              ? `${row.cutoffPercent.toFixed(1)}%`
              : "-",
        },
      ];

      return (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "11px",
          }}
        >
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td
                  style={{
                    width: "40%",
                    borderBottom: "1px solid #f3f4f6",
                    padding: "4px 6px",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  {r.label}
                </td>
                <td
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    padding: "4px 6px",
                    textAlign: "right",
                  }}
                >
                  {r.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // 전형 결과별 합/불 총점 평균 그래프
    if (meta.kind === "group" && meta.sectionKey === "phase-total-avg") {
      const groupStats = perGroup[meta.groupName];
      const data = groupStats?.phaseTotalAvgData || [];

      if (!data.length) {
        return (
          <div
            style={{
              fontSize: "11px",
              color: "#9ca3af",
              padding: "8px",
              border: "1px dashed #e5e7eb",
              borderRadius: "6px",
            }}
          >
            이 지원분야에 대한 합/불 총점 평균 데이터가 없습니다.
          </div>
        );
      }

      return (
        <div
          style={{
            width: "100%",
            maxWidth: "100%",
            height: "100%",
            minHeight: 160,
          }}
        >
          <ResponsiveContainer>
            <BarChart
              data={data}
              margin={{ top: 20, right: 10, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="phase" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avg" name="총점 평균" fillOpacity={0.9}>
                <LabelList
                  dataKey="avg"
                  position="top"
                  formatter={formatLabelValue}
                  style={{ fontSize: 11 }}
                />
                {data.map((d, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={
                      d.phase === "합격" ? COLORS.primary : COLORS.secondary
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // 평가항목별 표 + 그래프
    if (meta.kind === "group" && meta.sectionKey === "field-stats") {
      const groupStats = perGroup[meta.groupName];
      const fieldStats = groupStats?.fieldStats || [];

      if (!fieldStats.length) {
        return (
          <div
            style={{
              fontSize: "11px",
              color: "#9ca3af",
              padding: "8px",
              border: "1px dashed #e5e7eb",
              borderRadius: "6px",
            }}
          >
            이 지원분야에 대한 평가항목별 통계가 없습니다.
          </div>
        );
      }

      const chartData = fieldStats.map((fs) => ({
        field: fs.field,
        passAvg: fs.passAvg,
        failAvg: fs.failAvg,
      }));

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            gap: 4,
          }}
        >
          <div
            style={{
              width: "100%",
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "11px",
              }}
            >
              <thead>
                <tr>
                  {[
                    "평가항목",
                    "합격자 평균",
                    "불합격자 평균",
                    "합격 공헌도 (상관계수)",
                  ].map((label) => (
                    <th
                      key={label}
                      style={{
                        borderBottom: "1px solid #e5e7eb",
                        padding: "4px 6px",
                        backgroundColor: "#f9fafb",
                        fontWeight: 600,
                        textAlign: "center",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fieldStats.map((fs) => (
                  <tr key={fs.field}>
                    <td
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        padding: "4px 6px",
                      }}
                    >
                      {fs.field}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        padding: "4px 6px",
                        textAlign: "right",
                      }}
                    >
                      {fs.passAvg != null ? fs.passAvg.toFixed(2) : "-"}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        padding: "4px 6px",
                        textAlign: "right",
                      }}
                    >
                      {fs.failAvg != null ? fs.failAvg.toFixed(2) : "-"}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        padding: "4px 6px",
                        textAlign: "right",
                      }}
                    >
                      {fs.corr != null ? fs.corr.toFixed(3) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 140,
            }}
          >
            <ResponsiveContainer>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 10, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="field" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="passAvg"
                  name="합격자"
                  fill={COLORS.primary}
                  fillOpacity={0.9}
                  barSize={20}
                >
                  <LabelList
                    dataKey="passAvg"
                    position="top"
                    formatter={formatLabelValue}
                    style={{ fontSize: 10 }}
                  />
                </Bar>
                <Bar
                  dataKey="failAvg"
                  name="불합격자"
                  fill={COLORS.secondary}
                  fillOpacity={0.9}
                  barSize={20}
                >
                  <LabelList
                    dataKey="failAvg"
                    position="top"
                    formatter={formatLabelValue}
                    style={{ fontSize: 10 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    // 최종 결과 비교 그래프
    if (meta.kind === "group" && meta.sectionKey === "final-compare") {
      const groupStats = perGroup[meta.groupName];
      const data = groupStats?.finalCompareData || [];

      if (!data.length) {
        return (
          <div
            style={{
              fontSize: "11px",
              color: "#9ca3af",
              padding: "8px",
              border: "1px dashed #e5e7eb",
              borderRadius: "6px",
            }}
          >
            이 지원분야에 대한 최종 결과 비교 데이터가 없습니다.
          </div>
        );
      }

      return (
        <div
          style={{
            width: "100%",
            maxWidth: "100%",
            height: "100%",
            minHeight: 160,
          }}
        >
          <ResponsiveContainer>
            <BarChart
              data={data}
              margin={{ top: 20, right: 10, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="group" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avg" name="총점 평균" fillOpacity={0.9}>
                <LabelList
                  dataKey="avg"
                  position="top"
                  formatter={formatLabelValue}
                  style={{ fontSize: 11 }}
                />
                {data.map((d, idx) => (
                  <Cell
                    key={`final-cell-${idx}`}
                    fill={
                      d.group.includes("불합격")
                        ? COLORS.secondary
                        : COLORS.primary
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // 아직 스냅샷에 없는 것
    return (
      <div
        style={{
          padding: "10px 12px",
          borderRadius: "6px",
          border: "1px dashed #e5e7eb",
          fontSize: "11px",
          color: "#6b7280",
        }}
      >
        이 섹션에 해당하는 그래프/상세 표는 아직 Step6 계산 스냅샷에
        포함되어 있지 않습니다.
      </div>
    );
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
              마지막 저장: {formatKoreanDateTime(lastSavedAt)}
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
              border: "1px solid#2563eb",
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

      {/* 상태 메시지 */}
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

      {/* 페이지 설정 */}
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

      {/* 좌 / 우 레이아웃 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 340px) minmax(0, 1fr)",
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
            항목을 마우스로 끌어다가 우측 페이지 위에 떨구면, 해당 위치에
            표/그래프 박스가 생성됩니다. 텍스트는 페이지 아무 곳이나 클릭해서
            바로 입력하면 됩니다.
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

        {/* 우측: 페이지 에디터 */}
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
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <span>페이지 {pageIndex + 1}</span>
                  {/* 페이지 삭제 버튼 */}
                  {pages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePage(page.id)}
                      style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        border: "1px solid #fca5a5",
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
                <div
                  ref={(el) => {
                    if (el) {
                      pageRefs.current[page.id] = el;
                    }
                  }}
                  onDragOver={handlePageDragOver}
                  onDrop={handlePageDrop(page.id)}
                  style={{
                    width: `${scaledWidth}px`,
                    height: `${scaledHeight}px`,
                    backgroundColor: "#fff",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    borderRadius: "4px",
                    // 기존 padding: `${pageMargin}px` 제거, 텍스트 레이어에 여백을 적용함
                    boxSizing: "content-box", // 패딩을 사용하지 않으므로 content-box 유지
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  
                  {/* 여백 경계선 시각화: 절대 위치를 사용하여 여백 영역을 표시 */}
                  <div
                    style={{
                      position: "absolute",
                      top: `${pageMargin}px`,
                      bottom: `${pageMargin}px`,
                      left: `${pageMargin}px`,
                      right: `${pageMargin}px`,
                      border: `1px dashed #cccccc`, 
                      pointerEvents: "none", // 이벤트를 통과시켜 아래 요소가 작동하게 함
                      boxSizing: "border-box",
                      zIndex: 10, // 도형/텍스트 위에 배치
                    }}
                  />

                  {/* 텍스트 레이어: 페이지 전체. 여백 영역까지 스크롤됨. */}
                  {/* 텍스트가 여백 안쪽에서 시작되도록 padding 적용 */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      boxSizing: "border-box",
                      overflowY: "auto",
                      padding: `${pageMargin}px`, // 텍스트 영역에 여백 적용
                      zIndex: 1, // 도형보다 아래에 배치
                    }}
                  >
                    <PageTextEditor
                      content={page.text}
                      onChangeContent={(next) =>
                        handleChangePageText(page.id, next)
                      }
                    />
                  </div>

                  {/* 그래프/표 도형 레이어 */}
                  <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 2, // 텍스트보다 위에 배치
                    }}
                  >
                      {page.shapes.map((shape) => (
                        <div
                          key={shape.id}
                          onMouseDown={(e) => handleShapeMouseDown(page.id, shape, e)}
                          style={{
                            position: "absolute",
                            left: `${shape.x * 100}%`,
                            top: `${shape.y * 100}%`,
                            transform: "translate(-50%, -50%)",
                            width: `${shape.width}px`,
                            height: `${shape.height}px`,
                            backgroundColor: "#ffffff",
                            boxShadow: "0 0 0 1px #e5e7eb",
                            borderRadius: "4px",
                            padding: "4px 6px",
                            boxSizing: "border-box",
                            overflow: "auto",
                            cursor: "move",
                          }}
                        >
                          {/* 삭제 버튼 */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveShape(page.id, shape.id);
                            }}
                            style={{
                              position: "absolute",
                              top: 2,
                              right: 2,
                              border: "none",
                              background: "rgba(248,250,252,0.9)",
                              borderRadius: "999px",
                              padding: "0 5px",
                              fontSize: "10px",
                              cursor: "pointer",
                              color: "#9ca3af",
                              zIndex: 11, // 가장 위에 오도록
                            }}
                          >
                            ✕
                          </button>

                          {/* 리사이즈 핸들 (오른쪽 아래) */}
                          <div
                            onMouseDown={(e) =>
                              handleResizeMouseDown(page.id, shape, e)
                            }
                            style={{
                              position: "absolute",
                              right: 2,
                              bottom: 2,
                              width: 10,
                              height: 10,
                              borderRadius: "2px",
                              backgroundColor: "rgba(156,163,175,0.9)",
                              cursor: "nwse-resize",
                              zIndex: 11, // 가장 위에 오도록
                            }}
                          />

                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                            }}
                          >
                            {renderStep6SectionVisual(shape.meta || {})}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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