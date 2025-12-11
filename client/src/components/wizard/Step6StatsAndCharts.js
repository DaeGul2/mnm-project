// src/components/wizard/Step6StatsAndCharts.js
import React, { useMemo, useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { downloadStep6FullReportZip } from "../../utils/step6ReportDownloadUtils";
import LoadingSpinner from "../common/LoadingSpinner";
// ✅ Step6 계산 결과 저장/조회 서비스
import { getRoundCalc, saveRoundCalc } from "../../services/evalRoundService";
import { makeReportPDF } from "../../utils/MakeReportPDF"; // 🔹 추가
import { COLORS, defaultStyleConfig } from "../../utils/step6StyleConfig";
import {
  CopyAsImageButton,
  CopyableSection,
  HtmlInterpretationEditor,
  Step6ChartToolbox,
} from "./Step6SharedComponents";
import GroupScoreScatterChart from "./GroupScoreScatterChart";
import { buildGroupScoreScatterData } from "../../utils/scoreDistributionUtils";

// 🔹 Step6 화면에서 한 "페이지"당 허용할 대략적인 총 높이(px)
const PAGE_HEIGHT_LIMIT_PX = 1200;
// 🔹 상단 제목/버튼/여백 등으로 잡아먹는 대략적인 높이(px)
const HEADER_RESERVE_PX = 260;

// ✅ html2canvas로 만든 캔버스에서 실제 내용만 남기고 투명 여백 제거
function cropCanvasToContent(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let top = null;
  let left = null;
  let right = null;
  let bottom = null;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3]; // A 채널
      if (alpha !== 0) {
        if (top === null || y < top) top = y;
        if (bottom === null || y > bottom) bottom = y;
        if (left === null || x < left) left = x;
        if (right === null || x > right) right = x;
      }
    }
  }

  // 전부 투명하면(진짜 내용 없으면) 그냥 원본 리턴
  if (top === null) {
    return canvas;
  }

  const croppedWidth = right - left + 1;
  const croppedHeight = bottom - top + 1;

  const cropped = document.createElement("canvas");
  cropped.width = croppedWidth;
  cropped.height = croppedHeight;
  const cctx = cropped.getContext("2d");

  cctx.drawImage(
    canvas,
    left,
    top,
    croppedWidth,
    croppedHeight,
    0,
    0,
    croppedWidth,
    croppedHeight
  );

  return cropped;
}

function isNumericLike(value) {
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  if (!s) return false;
  const num = Number(s.replace(/,/g, ""));
  return !Number.isNaN(num);
}

function toNumberOrNull(value) {
  if (!isNumericLike(value)) return null;
  return Number(String(value).replace(/,/g, ""));
}

// 간단한 통계 계산 유틸
function mean(arr) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function stdDev(arr) {
  if (arr.length < 2) return null;
  const m = mean(arr);
  const variance =
    arr.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

// 상관계수 (phase 합격 여부 vs 항목 점수)
function correlation(xArr, yArr) {
  const n = xArr.length;
  if (n < 2 || yArr.length !== n) return null;

  const mx = mean(xArr);
  const my = mean(yArr);
  let cov = 0;
  let sx = 0;
  let sy = 0;

  for (let i = 0; i < n; i++) {
    const dx = xArr[i] - mx;
    const dy = yArr[i] - my;
    cov += dx * dy;
    sx += dx * dx;
    sy += dy * dy;
  }

  if (sx === 0 || sy === 0) return null;

  const stdX = Math.sqrt(sx / n);
  const stdY = Math.sqrt(sy / n);
  const c = cov / n / (stdX * stdY);
  return c;
}

// 그룹 순서 재정렬 유틸 (드래그앤드롭용)
function reorderGroupNames(list, sourceName, targetName) {
  const srcIdx = list.indexOf(sourceName);
  const tgtIdx = list.indexOf(targetName);
  if (srcIdx === -1 || tgtIdx === -1) return list;
  const next = [...list];
  next.splice(srcIdx, 1);
  next.splice(tgtIdx, 0, sourceName);
  return next;
}

// ✅ Legend를 무조건 "합격자 → 불합격자" 순서로 고정
const renderPassFailLegend = () => {
  const boxStyle = (color) => ({
    display: "inline-block",
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 4,
    backgroundColor: color,
  });

  return (
    <div
      style={{
        display: "flex",
        gap: "16px",
        fontSize: "12px",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        <span style={boxStyle(COLORS.primary)} />
        합격자
      </span>
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        <span style={boxStyle(COLORS.secondary)} />
        불합격자
      </span>
    </div>
  );
};

export default function Step6StatsAndCharts({
  rows,
  mapping,
  supportField,
  supportGroups,
  resultMapping,
  projectName,
  stageName,
  roundId,
  projectToken,
}) {
  // ✅ 스타일 설정 (실제 반영되는 값)
  const [styleConfig, setStyleConfig] = useState(defaultStyleConfig);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("지원분야별 통계 · 그래프");

  // 🔹 해석(HTML) 저장용 상태
  // overview: { crossGroupSummary: "<p>...</p>" }
  // perGroup: { [groupName]: { summaryStats, phaseTotalAvg, fieldStats, finalCompare } }
  const [interpretations, setInterpretations] = useState({
    overview: { crossGroupSummary: "" },
    perGroup: {},
  });

  // 🔹 보고서(PDF) 모드 상태
  const [isReportMode, setIsReportMode] = useState(false);
  const reportRef = useRef(null);

  // 🔹 PDF 생성 시, UI 페이지네이션 무시하고 전체 페이지를 한 번에 렌더링
  const [isPrintAllPages, setIsPrintAllPages] = useState(false);

  // 🔹 페이지 목록 & 현재 페이지 인덱스
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // ✅ Step6 계산 저장/불러오기 상태
  const [isSavingCalc, setIsSavingCalc] = useState(false);
  const [isLoadingCalc, setIsLoadingCalc] = useState(false);
  const [isMakingPdf, setIsMakingPdf] = useState(false);
  const [calcStatus, setCalcStatus] = useState("");
  const [hasLoadedCalc, setHasLoadedCalc] = useState(false);
  // ✅ 섹션 타이틀 (전형별로 저장)

  const {
    barSize,
    tableWidthScale,
    chartWidthScale,
    tableHeaderBold,
    tableHeaderBg,
    tableUseZebra,
    zebraRowColor,
    zebraBorderColor,
    showCartesianGrid,
    showLegend,
    chartHeight,
    labelFontSize,
    tableNumericAlign,
  } = styleConfig;

  // 지원분야 그룹별 후보자 데이터 구성
  const groupData = useMemo(() => {
    if (!rows.length || !supportField) return {};

    const phaseField = mapping.phaseResult;
    const finalField = mapping.finalResult;

    const getPhaseRole = (row) => {
      if (!phaseField) return null;
      const raw = String(row[phaseField] ?? "").trim();
      return resultMapping.phase?.[raw] || null;
    };
    const getFinalRole = (row) => {
      if (!finalField) return null;
      const raw = String(row[finalField] ?? "").trim();
      return resultMapping.final?.[raw] || null;
    };

    const evalFields = mapping.evalFields || [];

    const result = {};

    Object.entries(supportGroups).forEach(([groupName, rawSupports]) => {
      const groupRows = rows.filter((row) =>
        rawSupports.includes(String(row[supportField] ?? "").trim())
      );

      const candidates = [];

      groupRows.forEach((row) => {
        const phaseRole = getPhaseRole(row);
        if (phaseRole === "평가제외") return;

        const finalRole = getFinalRole(row);
        const evalScores = {};
        evalFields.forEach((field) => {
          const num = toNumberOrNull(row[field]);
          if (num !== null) {
            evalScores[field] = num;
          }
        });

        const evalVals = Object.values(evalScores);
        const totalScore = evalVals.length
          ? evalVals.reduce((a, b) => a + b, 0)
          : null;

        candidates.push({
          examNo: mapping.examNo ? row[mapping.examNo] : undefined,
          phaseRole,
          finalRole,
          evalScores,
          totalScore,
        });
      });

      result[groupName] = {
        candidates,
      };
    });

    return result;
  }, [rows, mapping, supportField, supportGroups, resultMapping]);

  // ✅ 지원분야별 총점 Scatter용 원시 포인트
  const groupScatterData = useMemo(
    () => buildGroupScoreScatterData(groupData),
    [groupData]
  );

  const initialIncludedFields = useMemo(() => {
    const res = {};
    Object.entries(groupData).forEach(([groupName, { candidates }]) => {
      const set = new Set();
      candidates.forEach((c) => {
        Object.keys(c.evalScores).forEach((f) => set.add(f));
      });
      res[groupName] = Array.from(set);
    });
    return res;
  }, [groupData]);

  const [includedFieldsByGroup, setIncludedFieldsByGroup] = useState(
    initialIncludedFields
  );
  const [openGroups, setOpenGroups] = useState({});
  const [groupOrder, setGroupOrder] = useState([]);
  const [draggingGroup, setDraggingGroup] = useState(null);

  const groupRefs = useRef({});
  const groupSectionRefs = useRef({}); // 각 지원분야별 섹션 참조 저장
  const globalSectionRefs = useRef({}); // 개요/전역 섹션 참조 저장
  const overviewRef = useRef(null);

  useEffect(() => {
    setIncludedFieldsByGroup(initialIncludedFields);
  }, [initialIncludedFields]);

  // ✅ roundId가 바뀌면 저장된 calc 다시 로딩할 수 있도록 플래그 리셋
  useEffect(() => {
    setHasLoadedCalc(false);
    setCalcStatus("");

    // 전형 바뀔 때 기본값으로 리셋
    setStyleConfig(defaultStyleConfig);
    setSectionTitle("지원분야별 통계 · 그래프");
    setInterpretations({
      overview: { crossGroupSummary: "" },
      perGroup: {},
    });
    setOpenGroups({});
    // includedFieldsByGroup은 아래 initialIncludedFields useEffect에서 다시 세팅됨
  }, [roundId]);

  // ✅ groupData 변경 시 기본 순서 초기화 / 유지 (최초에는 지원분야명 오름차순)
  useEffect(() => {
    const names = Object.keys(groupData);
    if (!names.length) {
      setGroupOrder([]);
      return;
    }

    const sortedNames = [...names].sort((a, b) => a.localeCompare(b));

    setGroupOrder((prev) => {
      if (!prev || !prev.length) return sortedNames;
      const filtered = prev.filter((name) => sortedNames.includes(name));
      const missing = sortedNames.filter((name) => !filtered.includes(name));
      return [...filtered, ...missing];
    });
  }, [groupData]);

  const crossGroupSummary = useMemo(() => {
    const rowsForSummary = [];

    Object.entries(groupData).forEach(([groupName, { candidates }]) => {
      const totalScores = candidates
        .map((c) => c.totalScore)
        .filter((v) => v !== null);

      const n = candidates.length;
      if (!n) {
        rowsForSummary.push({
          groupName,
          n: 0,
          passRate: null,
          avgTotal: null,
          cutoff: null,
          cutoffPercent: null,
        });
        return;
      }

      const phasePass = candidates.filter((c) => c.phaseRole === "합격");

      const avgTotal = totalScores.length ? mean(totalScores) : null;

      let cutoff = null;
      let cutoffPercent = null;

      if (phasePass.length && totalScores.length) {
        const passScores = phasePass
          .map((c) => c.totalScore)
          .filter((v) => v !== null);
        if (passScores.length) {
          cutoff = Math.min(...passScores);
          const nTotal = totalScores.length;
          const nAboveCut = totalScores.filter((s) => s >= cutoff).length;
          cutoffPercent = (nAboveCut / nTotal) * 100;
        }
      }

      const passRate = n > 0 ? (phasePass.length / n) * 100 : null;

      rowsForSummary.push({
        groupName,
        n,
        passRate,
        avgTotal,
        cutoff,
        cutoffPercent,
      });
    });

    return rowsForSummary;
  }, [groupData]);

  // ✅ ReportEditor에서 그래프/표 다시 그릴 수 있도록, 그룹별 통계 스냅샷 저장용
  const perGroupStats = useMemo(() => {
    const result = {};

    Object.entries(groupData).forEach(([groupName, { candidates }]) => {
      if (!candidates || !candidates.length) return;

      const includedFields = includedFieldsByGroup[groupName] || [];

      // 총점 배열
      const totalScores = candidates
        .map((c) => c.totalScore)
        .filter((v) => v !== null && v !== undefined);

      const passCandidates = candidates.filter((c) => c.phaseRole === "합격");
      const failCandidates = candidates.filter((c) => c.phaseRole === "불합격");

      const passScores = passCandidates
        .map((c) => c.totalScore)
        .filter((v) => v !== null && v !== undefined);
      const failScores = failCandidates
        .map((c) => c.totalScore)
        .filter((v) => v !== null && v !== undefined);

      const n = candidates.length;

      // ✅ 총점 요약 통계 (Step6에서 보던 개요 그대로)
      const avgTotal = totalScores.length ? mean(totalScores) : null;
      const medianTotal = totalScores.length ? median(totalScores) : null;
      const stdTotal = totalScores.length ? stdDev(totalScores) : null;
      const maxTotal =
        totalScores.length > 0 ? Math.max(...totalScores) : null;
      const minTotal =
        totalScores.length > 0 ? Math.min(...totalScores) : null;

      // 합격자 기준 최저점(커트라인)
      let cutoff = null;
      if (passScores.length > 0) {
        cutoff = Math.min(...passScores);
      }

      // 합격컷 상위 %
      let cutoffPercent = null;
      if (cutoff != null && totalScores.length > 0) {
        const nAboveCut = totalScores.filter((s) => s >= cutoff).length;
        cutoffPercent = (nAboveCut / totalScores.length) * 100;
      }

      // 전형 합격률
      const passRate = n > 0 ? (passCandidates.length / n) * 100 : null;

      // 불합격자 기준 최고점
      const bestFailTotal =
        failScores.length > 0 ? Math.max(...failScores) : null;

      // ✅ Editor에서 그대로 재사용할 "각 분야별 요약 통계" 스냅샷
      const summaryStats = {
        n, // 통계 대상 인원
        avgTotal, // 총점 평균
        medianTotal, // 총점 중앙값
        stdTotal, // 총점 표준편차
        maxTotal, // 최고점
        minTotal, // 최저점
        cutoff, // 합격자 기준 최저점(커트라인)
        cutoffPercent, // 합격컷 상위 %
        passRate, // 전형 합격률(%)
        bestFailTotal, // 불합격자 기준 최고점
      };

      // 전형 결과별 합/불 총점 평균
      const phaseTotalAvgData = [];
      if (passScores.length > 0) {
        phaseTotalAvgData.push({
          phase: "합격",
          avg: mean(passScores),
        });
      }
      if (failScores.length > 0) {
        phaseTotalAvgData.push({
          phase: "불합격",
          avg: mean(failScores),
        });
      }

      // 평가항목별 합격/불합격 평균 + 상관계수
      const fieldStats = includedFields.map((field) => {
        const passFieldScores = passCandidates
          .map((c) => c.evalScores[field])
          .filter((v) => v !== null && v !== undefined);

        const failFieldScores = failCandidates
          .map((c) => c.evalScores[field])
          .filter((v) => v !== null && v !== undefined);

        const corrX = [];
        const corrY = [];
        candidates.forEach((c) => {
          const v = c.evalScores[field];
          if (v === null || v === undefined || !isNumericLike(v)) return;
          // 합격: 1, 불합격: 0
          if (c.phaseRole === "합격") {
            corrX.push(Number(v));
            corrY.push(1);
          } else if (c.phaseRole === "불합격") {
            corrX.push(Number(v));
            corrY.push(0);
          }
        });

        const corrVal =
          corrX.length >= 2 && corrY.length === corrX.length
            ? correlation(corrX, corrY)
            : null;

        return {
          field,
          passAvg: passFieldScores.length ? mean(passFieldScores) : null,
          failAvg: failFieldScores.length ? mean(failFieldScores) : null,
          corr: corrVal,
        };
      });

      // 최종 합격 vs 최종 불합격(전형 합격) 비교
      const finalPass = candidates.filter((c) => c.finalRole === "합격");
      const finalFailPhasePass = candidates.filter(
        (c) => c.finalRole === "불합격" && c.phaseRole === "합격"
      );

      const finalPassScores = finalPass
        .map((c) => c.totalScore)
        .filter((v) => v !== null && v !== undefined);
      const finalFailPhasePassScores = finalFailPhasePass
        .map((c) => c.totalScore)
        .filter((v) => v !== null && v !== undefined);

      const finalCompareData = [];
      if (finalPassScores.length) {
        finalCompareData.push({
          group: "최종 합격",
          avg: mean(finalPassScores),
        });
      }
      if (finalFailPhasePassScores.length) {
        finalCompareData.push({
          group: "최종 불합격(전형 합격)",
          avg: mean(finalFailPhasePassScores),
        });
      }

      result[groupName] = {
        summaryStats, // ✅ 새로 추가
        phaseTotalAvgData,
        fieldStats,
        finalCompareData,
      };
    });

    return result;
  }, [groupData, includedFieldsByGroup]);

  const handleToggleField = (groupName, field) => () => {
    setIncludedFieldsByGroup((prev) => {
      const curr = prev[groupName] || [];
      const exists = curr.includes(field);
      const nextGroup = exists ? curr.filter((f) => f !== field) : [...curr, field];
      return {
        ...prev,
        [groupName]: nextGroup,
      };
    });
  };

  const formatLabelValue = (value) =>
    value == null ? "" : value.toFixed(1);

  // ✅ 드래그앤드롭 핸들러: 지원분야 간 요약 비교 표에서 순서 변경
  const handleDragStart = (e, groupName) => {
    setDraggingGroup(groupName);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  };

  const handleDragOver = (e, groupName) => {
    e.preventDefault();
    if (!draggingGroup || draggingGroup === groupName) return;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDrop = (e, targetGroupName) => {
    e.preventDefault();
    if (!draggingGroup || draggingGroup === targetGroupName) {
      setDraggingGroup(null);
      return;
    }
    setGroupOrder((prev) => {
      const base = prev && prev.length ? prev : Object.keys(groupData);
      return reorderGroupNames(base, draggingGroup, targetGroupName);
    });
    setDraggingGroup(null);
  };

  // ✅ 현재 화면에서 사용할 실제 순서
  const orderedGroupNames =
    groupOrder && groupOrder.length ? groupOrder : Object.keys(groupData);

  // 🔹 Step6 페이지 자동 분할 (DOM 높이 기반)
  useEffect(() => {
    const names = orderedGroupNames;
    if (!names.length) {
      setPages([
        {
          key: "overview-only",
          showOverview: true,
          groupNames: [],
        },
      ]);
      setCurrentPageIndex(0);
      return;
    }

    const newPages = [];

    // 첫 페이지: 개요 + 그룹들
    let currentPage = {
      key: "page-1",
      showOverview: true,
      groupNames: [],
    };

    let usedHeight =
      HEADER_RESERVE_PX + (overviewRef.current?.offsetHeight || 0);

    names.forEach((groupName, idx) => {
      const el = groupRefs.current[groupName];
      const h = el?.offsetHeight || 500;

      // 이 그룹을 넣으면 한도 초과 → 새 페이지 생성
      if (
        currentPage.groupNames.length > 0 &&
        usedHeight + h > PAGE_HEIGHT_LIMIT_PX
      ) {
        newPages.push(currentPage);
        currentPage = {
          key: `page-${newPages.length + 1}`,
          showOverview: false,
          groupNames: [],
        };
        usedHeight = HEADER_RESERVE_PX;
      }

      currentPage.groupNames.push(groupName);
      usedHeight += h;

      if (idx === names.length - 1) {
        newPages.push(currentPage);
      }
    });

    setPages(newPages);
    setCurrentPageIndex(0);
  }, [orderedGroupNames, groupData]);

  const totalPages = pages.length || 1;
  const safePageIndex = Math.min(currentPageIndex, totalPages - 1);
  const currentPage = pages[safePageIndex] || {
    showOverview: true,
    groupNames: [],
  };
  const currentPageGroupNames = currentPage.groupNames || [];
  const visibleGroupNames = isPrintAllPages
    ? orderedGroupNames
    : currentPageGroupNames;

  // 지원분야별 섹션 일괄 다운로드
  const handleDownloadAllSections = async (groupName) => {
    const sectionsMap = groupSectionRefs.current[groupName] || {};
    const sections = Object.values(sectionsMap);

    if (!sections.length) {
      alert("이 지원분야에서 다운로드할 섹션을 찾을 수 없습니다.");
      return;
    }

    sections.sort((a, b) => {
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });

    for (const section of sections) {
      const node = section.ref?.current;
      if (!node) continue;

      try {
        const canvas = await html2canvas(node, { scale: 2 });
        const cropped = cropCanvasToContent(canvas);
        const blob = await new Promise((resolve) =>
          cropped.toBlob(resolve, "image/png")
        );
        if (!blob) continue;

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        const safeGroup = String(groupName).replace(/[\\/:*?"<>|]/g, "_");
        const safeTitle = String(section.title || "section").replace(
          /[\\/:*?"<>|]/g,
          "_"
        );
        const typePart = section.type === "그래프" ? "그래프" : "표";

        a.href = url;
        a.download = `${safeGroup}_${typePart}_${safeTitle}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // 너무 과하게 폭주하지 않게 살짝 딜레이
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const registerOverviewSection = (info) => {
    if (!info || !info.id) return;
    globalSectionRefs.current[info.id] = info;
  };

  const handleDownloadWholeReport = async () => {
    // 현재 상태 백업
    const prevPageIndex = currentPageIndex;
    const prevIsPrintAll = isPrintAllPages;
    const prevIsReportMode = isReportMode;

    try {
      setIsDownloadingAll(true);
      // 🔹 전체 페이지 렌더 + 보고서 모드(편집 UI 숨김)
      setIsPrintAllPages(true);
      setIsReportMode(true);

      // 렌더링/refs 등록될 시간 약간 기다리기
      await new Promise((resolve) => setTimeout(resolve, 400));

      const overviewSectionsMap = globalSectionRefs.current || {};
      const overviewSections = Object.values(overviewSectionsMap).sort(
        (a, b) => {
          if (a.id < b.id) return -1;
          if (a.id > b.id) return 1;
          return 0;
        }
      );

      const groupEntries = Object.entries(groupSectionRefs.current || {});
      const groupSections = groupEntries.map(([groupName, sectionMap]) => {
        const sections = Object.values(sectionMap || {}).sort((a, b) => {
          if (a.id < b.id) return -1;
          if (a.id > b.id) return 1;
          return 0;
        });
        return {
          groupName,
          sections,
        };
      });

      const hasAnySection =
        overviewSections.length > 0 ||
        groupSections.some((g) => g.sections.length > 0);

      if (!hasAnySection) {
        alert("일괄 다운로드할 섹션을 찾을 수 없습니다.");
        return;
      }

      await downloadStep6FullReportZip({
        overviewSections,
        groupSections,
        projectName,
        stageName,
      });
    } catch (err) {
      console.error(err);
      alert("일괄 다운로드 중 오류가 발생했습니다.");
    } finally {
      // 🔹 상태 원복
      setIsPrintAllPages(prevIsPrintAll);
      setIsReportMode(prevIsReportMode);
      setCurrentPageIndex(prevPageIndex);
      setIsDownloadingAll(false);
    }
  };

  // 🔹 PDF "보고서화" 핸들러 (전체 페이지 기준)
  // 🔹 Step6의 "현재 페이지"들을 순서대로 캡쳐해서 PDF로 만드는 핸들러
  const handleMakeReportPdf = async () => {
    const node = reportRef.current;
    if (!node) {
      alert("PDF로 만들 영역을 찾을 수 없습니다.");
      return;
    }

    const safe = (v, fallback) =>
      String(v || fallback)
        .trim()
        .replace(/[\\/:*?"<>|]/g, "_");

    const fileName = `${safe(projectName, "프로젝트")}_${safe(
      stageName,
      "전형"
    )}_Step6_통계보고서.pdf`;

    if (!totalPages || totalPages < 1) {
      alert("표시할 페이지가 없습니다.");
      return;
    }

    // 보고서 모드: 버튼 / 인풋 / 툴바 숨김
    setIsReportMode(true);
    setIsMakingPdf(true);

    // 원래 보고 있던 페이지 기억
    const prevPageIndex = currentPageIndex;

    try {
      const canvases = [];

      for (let i = 0; i < totalPages; i += 1) {
        // 각 페이지로 이동
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => {
          setCurrentPageIndex(i);
          // 리렌더 + 레이아웃 반영 기다리기
          setTimeout(resolve, 300);
        });

        // 현재 페이지 전체를 캡쳐
        // eslint-disable-next-line no-await-in-loop
        const canvas = await html2canvas(node, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });

        canvases.push(canvas);
      }

      // 페이지별 canvas 배열을 PDF로 합치기
      await makeReportPDF(canvases, { fileName, marginMm: 8 });
    } catch (err) {
      console.error(err);
      alert("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      // 원래 페이지로 복귀 + 모드 해제
      setCurrentPageIndex(prevPageIndex);
      setIsReportMode(false);
      setIsMakingPdf(false);
    }
  };

  // ✅ Step6 계산 결과 저장용 payload 생성
  const buildCalcPayload = () => ({
    config: {
      styleConfig,
      includedFieldsByGroup,
      groupOrder,
      openGroups,
      sectionTitle, // 🔹 여기 유지
      interpretations, // 🔹 해석까지 같이 저장
    },
    stats: {
      crossGroupSummary,
      perGroup: perGroupStats,
    },
  });

  // ✅ Step6 계산 결과 저장
  const handleSaveCalc = async () => {
    if (!roundId || !projectToken) {
      alert("전형 또는 프로젝트 토큰 정보가 없어 저장할 수 없습니다.");
      return;
    }
    try {
      setIsSavingCalc(true);
      setCalcStatus("");

      const payload = buildCalcPayload();

      const res = await saveRoundCalc(
        roundId,
        {
          name: `${stageName || "전형"} Step6 분석`,
          config: payload.config,
          stats: payload.stats,
        },
        projectToken
      );

      setCalcStatus(res?.message || "Step6 계산 결과를 저장했습니다.");
    } catch (err) {
      console.error("saveRoundCalc error:", err);
      setCalcStatus("Step6 계산 결과 저장 중 오류가 발생했습니다.");
      alert("Step6 계산 결과 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSavingCalc(false);
    }
  };

  // ✅ Step6 계산 결과 불러오기 (있으면 config 반영)
  useEffect(() => {
    const shouldLoad =
      roundId &&
      projectToken &&
      !hasLoadedCalc &&
      rows &&
      rows.length > 0 &&
      supportField &&
      supportGroups &&
      Object.keys(supportGroups).length > 0;

    if (!shouldLoad) return;

    const load = async () => {
      try {
        setIsLoadingCalc(true);
        setCalcStatus("");

        const data = await getRoundCalc(roundId, projectToken);
        if (!data || !data.calc) {
          // 🔹 이 전형에는 저장된 Step6 설정이 전혀 없는 경우 → 기본값으로 정리
          setStyleConfig(defaultStyleConfig);
          setSectionTitle("지원분야별 통계 · 그래프");
          setInterpretations({
            overview: { crossGroupSummary: "" },
            perGroup: {},
          });
          setOpenGroups({});
          // groupData 기반 기본 필드 포함 상태로 초기화
          setIncludedFieldsByGroup(initialIncludedFields);

          setCalcStatus(
            "저장된 Step6 계산 결과가 없어 현재 데이터로 새로 계산 중입니다."
          );
          setHasLoadedCalc(true);
          return;
        }
        const { config } = data.calc || {};
        if (config && typeof config === "object") {
          if (config.styleConfig) {
            setStyleConfig((prev) => ({
              ...prev,
              ...config.styleConfig,
            }));
          }
          if (config.includedFieldsByGroup) {
            setIncludedFieldsByGroup(config.includedFieldsByGroup);
          }
          if (config.groupOrder) {
            setGroupOrder(config.groupOrder);
          }
          if (config.openGroups) {
            setOpenGroups(config.openGroups);
          }
          if (config.sectionTitle) {
            setSectionTitle(config.sectionTitle);
          }
          if (config.interpretations) {
            setInterpretations(config.interpretations);
          }
        }

        setCalcStatus("이 전형의 저장된 Step6 설정을 불러왔습니다.");
      } catch (err) {
        const status = err?.response?.status;
        if (status === 404) {
          // 🔹 이 전형에 대해 저장된 Step6 결과가 전혀 없음 → 기본 상태 유지/초기화
          setStyleConfig(defaultStyleConfig);
          setSectionTitle("지원분야별 통계 · 그래프");
          setInterpretations({
            overview: { crossGroupSummary: "" },
            perGroup: {},
          });
          setOpenGroups({});
          setIncludedFieldsByGroup(initialIncludedFields);

          setCalcStatus(
            "저장된 Step6 계산 결과가 없어 현재 데이터로 새로 계산 중입니다."
          );
        } else {
          console.error("getRoundCalc error:", err);
          setCalcStatus("Step6 계산 결과 불러오는 중 오류가 발생했습니다.");
        }
      } finally {
        setIsLoadingCalc(false);
        setHasLoadedCalc(true);
      }
    };

    load();
  }, [roundId, projectToken, hasLoadedCalc, rows, supportField, supportGroups]);

  return (
    <div style={{ position: "relative" }}>
      {(isDownloadingAll || isMakingPdf) && (
        <LoadingSpinner
          message={
            isDownloadingAll
              ? "전체 레포트 일괄 다운로드 준비 중입니다..."
              : "보고서 PDF를 생성 중입니다..."
          }
        />
      )}

      {/* 📌 PDF 캡처 대상은 여기부터 */}
      <div ref={reportRef}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            marginBottom: "4px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ margin: 0 }}>{sectionTitle}</h2>
            {!isReportMode && (
              <input
                type="text"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="섹션 제목을 입력하세요"
                style={{
                  fontSize: "12px",
                  padding: "4px 8px",
                  borderRadius: "999px",
                  border: "1px solid #ccc",
                  minWidth: "220px",
                }}
              />
            )}
          </div>
          {!isReportMode && (
            <button
              type="button"
              onClick={handleMakeReportPdf}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid #1976d2",
                backgroundColor: "#1976d2",
                color: "#fff",
                fontSize: "12px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              📄 보고서화하기
            </button>
          )}
        </div>

        <div
          style={{
            marginBottom: "8px",
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: "11px", color: "#666", minHeight: "16px" }}>
            {isLoadingCalc
              ? "저장된 Step6 계산 결과를 불러오는 중입니다..."
              : calcStatus}
          </div>
          {!isReportMode && (
            <div
              style={{
                display: "flex",
                gap: "8px",
              }}
            >
              <button
                type="button"
                onClick={handleSaveCalc}
                disabled={!roundId || !projectToken || isSavingCalc}
                style={{
                  padding: "6px 12px",
                  borderRadius: "999px",
                  border: "1px solid #555",
                  backgroundColor: isSavingCalc ? "#eee" : "#fff",
                  color: "#333",
                  fontSize: "12px",
                  cursor:
                    !roundId || !projectToken || isSavingCalc
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    !roundId || !projectToken || isSavingCalc ? 0.6 : 1,
                }}
              >
                💾 Step6 계산 저장
              </button>
              <button
                type="button"
                onClick={handleDownloadWholeReport}
                style={{
                  padding: "6px 12px",
                  borderRadius: "999px",
                  border: "1px solid #1976d2",
                  backgroundColor: "#1976d2",
                  color: "#fff",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                ⬇ 레포트 전체 일괄 다운로드
              </button>
            </div>
          )}
        </div>

        {/* 페이지네이션 (PDF 모드/전체 렌더 모드에서는 숨김) */}
        {totalPages > 1 && !isReportMode && !isPrintAllPages && (
          <div
            style={{
              marginBottom: "12px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
            }}
          >
            <button
              type="button"
              onClick={() =>
                setCurrentPageIndex((idx) => Math.max(0, idx - 1))
              }
              disabled={safePageIndex === 0}
              style={{
                padding: "4px 10px",
                borderRadius: "999px",
                border: "1px solid #ccc",
                backgroundColor: safePageIndex === 0 ? "#f5f5f5" : "#fff",
                cursor: safePageIndex === 0 ? "not-allowed" : "pointer",
              }}
            >
              ◀ 이전
            </button>
            <span>
              페이지 {safePageIndex + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentPageIndex((idx) =>
                  Math.min(totalPages - 1, idx + 1)
                )
              }
              disabled={safePageIndex === totalPages - 1}
              style={{
                padding: "4px 10px",
                borderRadius: "999px",
                border: "1px solid #ccc",
                backgroundColor:
                  safePageIndex === totalPages - 1 ? "#f5f5f5" : "#fff",
                cursor:
                  safePageIndex === totalPages - 1
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              다음 ▶
            </button>
          </div>
        )}

        {/* ✅ Step 6 전용 floating 도구 모음 (이제 '적용' 눌러야 실제 반영) */}
        {!isReportMode && (
          <Step6ChartToolbox config={styleConfig} onApply={setStyleConfig} />
        )}

        {/* 개요(지원분야 간 요약 비교) - PDF모드/전체 렌더에서는 항상 출력 */}
        {(isPrintAllPages || currentPage.showOverview) && (
          <div ref={overviewRef}>
            {/* 지원분야 간 요약 비교 표 (전역) */}
            <CopyableSection
              title="지원분야 간 요약 비교"
              onRegisterSection={registerOverviewSection}
              sectionId="00_crossGroupSummary"
              sectionType="표"
              hideToolbar={isReportMode}
            >
              <div
                style={{
                  width: `${tableWidthScale}%`,
                  maxWidth: "100%",
                  overflowX: "auto",
                  resize: "horizontal",
                  display: "inline-block",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        "지원분야(통합)",
                        "통계 대상 인원",
                        "전형 합격률(%)",
                        "총점 평균",
                        "전형 합격 커트라인 점수",
                        "합격컷 상위 %",
                      ].map((label, idx) => (
                        <th
                          key={label}
                          style={{
                            borderBottom: `1px solid ${zebraBorderColor}`,
                            textAlign:
                              idx === 0 ? "left" : tableNumericAlign,
                            padding: "4px 8px",
                            fontWeight: tableHeaderBold ? 600 : 400,
                            backgroundColor: tableHeaderBg,
                            borderRight:
                              tableUseZebra && idx !== 5
                                ? `1px solid ${zebraBorderColor}`
                                : "none",
                          }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orderedGroupNames.map((groupName, rowIndex) => {
                      const row = crossGroupSummary.find(
                        (r) => r.groupName === groupName
                      );
                      if (!row) return null;
                      const isDragging = draggingGroup === groupName;
                      return (
                        <tr
                          key={groupName}
                          draggable
                          onDragStart={(e) =>
                            handleDragStart(e, groupName)
                          }
                          onDragOver={(e) =>
                            handleDragOver(e, groupName)
                          }
                          onDrop={(e) => handleDrop(e, groupName)}
                          style={{
                            cursor: "move",
                            backgroundColor: isDragging
                              ? "#e3f2fd"
                              : tableUseZebra && rowIndex % 2 === 1
                                ? zebraRowColor
                                : "transparent",
                          }}
                        >
                          <td
                            style={{
                              borderBottom: "1px solid #eee",
                              padding: "4px 8px",
                              borderRight: tableUseZebra
                                ? `1px solid ${zebraBorderColor}`
                                : "none",
                            }}
                          >
                            {row.groupName}
                          </td>
                          <td
                            style={{
                              borderBottom: "1px solid #eee",
                              textAlign: tableNumericAlign,
                              padding: "4px 8px",
                              borderRight: tableUseZebra
                                ? `1px solid ${zebraBorderColor}`
                                : "none",
                            }}
                          >
                            {row.n}
                          </td>
                          <td
                            style={{
                              borderBottom: "1px solid #eee",
                              textAlign: tableNumericAlign,
                              padding: "4px 8px",
                              borderRight: tableUseZebra
                                ? `1px solid ${zebraBorderColor}`
                                : "none",
                            }}
                          >
                            {row.passRate !== null
                              ? row.passRate.toFixed(1)
                              : "-"}
                          </td>
                          <td
                            style={{
                              borderBottom: "1px solid #eee",
                              textAlign: tableNumericAlign,
                              padding: "4px 8px",
                              borderRight: tableUseZebra
                                ? `1px solid ${zebraBorderColor}`
                                : "none",
                            }}
                          >
                            {row.avgTotal !== null
                              ? row.avgTotal.toFixed(2)
                              : "-"}
                          </td>
                          <td
                            style={{
                              borderBottom: "1px solid #eee",
                              textAlign: tableNumericAlign,
                              padding: "4px 8px",
                              borderRight: tableUseZebra
                                ? `1px solid ${zebraBorderColor}`
                                : "none",
                            }}
                          >
                            {row.cutoff !== null
                              ? row.cutoff.toFixed(2)
                              : "-"}
                          </td>
                          <td
                            style={{
                              borderBottom: "1px solid #eee",
                              textAlign: tableNumericAlign,
                              padding: "4px 8px",
                            }}
                          >
                            {row.cutoffPercent !== null
                              ? row.cutoffPercent.toFixed(1)
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <HtmlInterpretationEditor
                label="지원분야 간 요약 비교 해석"
                value={interpretations.overview?.crossGroupSummary || ""}
                onChange={(val) =>
                  setInterpretations((prev) => ({
                    ...prev,
                    overview: {
                      ...(prev.overview || {}),
                      crossGroupSummary: val,
                    },
                  }))
                }
                readOnly={isReportMode}
                previewPayload={{
                  role:
                    "지원분야 간 요약 비교 표를 기반으로 전체 모집단 구조와 지원분야 간 차이를 해석할 때 사용하는 데이터입니다.",
                  scope: "overview",
                  data: crossGroupSummary, // 각 지원분야별 n, passRate, avgTotal, cutoff, cutoffPercent
                }}
                autoConfig={
                  projectToken
                    ? {
                      projectName,
                      stageName,
                      section: "overview_crossGroupSummary",
                      groupName: null,
                      projectToken,
                    }
                    : null
                }
              />
            </CopyableSection>
          </div>
        )}

        {/* 각 지원분야별 아코디언 (현재 페이지 / 혹은 전체) */}
        {visibleGroupNames.map((groupName) => {
          const group = groupData[groupName];
          if (!group) return null;
          const { candidates } = group;

          const includedFields = includedFieldsByGroup[groupName] || [];

          const totalScores = candidates
            .map((c) => c.totalScore)
            .filter((v) => v !== null);

          const passCandidates = candidates.filter(
            (c) => c.phaseRole === "합격"
          );
          const failCandidates = candidates.filter(
            (c) => c.phaseRole === "불합격"
          );

          const passScores = passCandidates
            .map((c) => c.totalScore)
            .filter((v) => v !== null);
          const failScores = failCandidates
            .map((c) => c.totalScore)
            .filter((v) => v !== null);

          const totalAvg = mean(totalScores);
          const totalStd = stdDev(totalScores);
          const totalMed = median(totalScores);

          const cutoff =
            passScores.length > 0 ? Math.min(...passScores) : null;
          let cutoffPercent = null;
          if (cutoff !== null && totalScores.length) {
            const nAbove = totalScores.filter((s) => s >= cutoff).length;
            cutoffPercent = (nAbove / totalScores.length) * 100;
          }

          const groupTotal = candidates.length;
          const groupPassRate =
            groupTotal > 0 ? (passCandidates.length / groupTotal) * 100 : null;

          const phaseTotalAvgData = [
            {
              phase: "합격",
              avg: passScores.length > 0 ? mean(passScores) : null,
            },
            {
              phase: "불합격",
              avg: failScores.length > 0 ? mean(failScores) : null,
            },
          ].filter((d) => d.avg !== null);

          const fieldStats = includedFields.map((field) => {
            const passFieldScores = passCandidates
              .map((c) => c.evalScores[field])
              .filter((v) => v !== null && v !== undefined);

            const failFieldScores = failCandidates
              .map((c) => c.evalScores[field])
              .filter((v) => v !== null && v !== undefined);

            const corrX = [];
            const corrY = [];
            candidates.forEach((c) => {
              const v = c.evalScores[field];
              if (v === null || v === undefined || !isNumericLike(v)) {
                return;
              }
              if (c.phaseRole === "합격") {
                corrX.push(Number(v));
                corrY.push(1);
              } else if (c.phaseRole === "불합격") {
                corrX.push(Number(v));
                corrY.push(0);
              }
            });

            const corrVal = corrX.length >= 2 ? correlation(corrX, corrY) : null;

            return {
              field,
              passAvg:
                passFieldScores.length > 0 ? mean(passFieldScores) : null,
              failAvg:
                failFieldScores.length > 0 ? mean(failFieldScores) : null,
              corr: corrVal,
            };
          });

          const fieldChartData = fieldStats.map((fs) => ({
            field: fs.field,
            passAvg: fs.passAvg,
            failAvg: fs.failAvg,
          }));

          const finalPass = candidates.filter((c) => c.finalRole === "합격");
          const finalFailPhasePass = candidates.filter(
            (c) => c.finalRole === "불합격" && c.phaseRole === "합격"
          );

          const finalCompareData = [];
          const finalPassScores = finalPass
            .map((c) => c.totalScore)
            .filter((v) => v !== null);
          const finalFailPhasePassScores = finalFailPhasePass
            .map((c) => c.totalScore)
            .filter((v) => v !== null);

          if (finalPassScores.length > 0) {
            finalCompareData.push({
              group: "최종 합격",
              avg: mean(finalPassScores),
            });
          }
          if (finalFailPhasePassScores.length > 0) {
            finalCompareData.push({
              group: "최종 불합격(전형 합격)",
              avg: mean(finalFailPhasePassScores),
            });
          }

          const open = openGroups[groupName] ?? true;

          const availableFieldsSet = new Set();
          candidates.forEach((c) => {
            Object.keys(c.evalScores).forEach((f) => availableFieldsSet.add(f));
          });
          const availableFields = Array.from(availableFieldsSet);

          const groupRefWrapper = {
            get current() {
              return groupRefs.current[groupName] || null;
            },
          };

          const registerSectionForGroup = (info) => {
            if (!info || !info.id) return;
            if (!groupSectionRefs.current[groupName]) {
              groupSectionRefs.current[groupName] = {};
            }
            groupSectionRefs.current[groupName][info.id] = info;
          };

          const handleDownloadAll = () => {
            handleDownloadAllSections(groupName);
          };

          const groupInterpretations =
            interpretations.perGroup?.[groupName] || {};
          const statsSnapshot = perGroupStats[groupName] || {};
          const scatterPoints = groupScatterData[groupName] || [];
          return (
            <div
              key={groupName}
              ref={(el) => {
                groupRefs.current[groupName] = el;
              }}
              style={{
                border: "1px solid #ddd",
                borderRadius: "10px",
                marginBottom: "16px",
                backgroundColor: "#fff",
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid#eee",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    flex: 1,
                  }}
                  onClick={() =>
                    setOpenGroups((prev) => ({
                      ...prev,
                      [groupName]: !open,
                    }))
                  }
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {groupName}{" "}
                      <span
                        style={{ fontWeight: 400, fontSize: "12px" }}
                      >
                        (통계 대상 {groupTotal}명)
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        marginTop: "2px",
                      }}
                    >
                      전형 합격률{" "}
                      {groupPassRate !== null
                        ? `${groupPassRate.toFixed(1)}%`
                        : "-"}
                      {cutoffPercent !== null &&
                        ` · 합격컷 상위 ${cutoffPercent.toFixed(1)}%`}
                    </div>
                  </div>
                  <div style={{ fontSize: "18px" }}>
                    {open ? "▴" : "▾"}
                  </div>
                </div>

                {!isReportMode && (
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <CopyAsImageButton
                      targetRef={groupRefWrapper}
                      label="이 지원분야 전체 복사"
                    />
                    <button
                      type="button"
                      onClick={handleDownloadAll}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "999px",
                        border: "1px solid #666",
                        backgroundColor: "#fff",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      ⬇ 이 지원분야 일괄 다운로드
                    </button>
                  </div>
                )}
              </div>

              {open && (
                <div style={{ padding: "10px 14px" }}>
                  {/* 평가항목 포함/제외 토글 */}
                  <CopyableSection
                    title="평가항목 포함 여부"
                    extraRight={
                      <span
                        style={{ fontSize: "11px", color: "#666" }}
                      >
                        체크된 항목만 통계/그래프에 반영
                      </span>
                    }
                    onRegisterSection={registerSectionForGroup}
                    sectionId="01_fieldToggle"
                    sectionType="표"
                    hideToolbar={isReportMode}
                  >
                    {availableFields.length === 0 ? (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#999",
                        }}
                      >
                        이 지원분야에 사용 가능한 평가항목이 없습니다.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px 12px",
                          fontSize: "12px",
                        }}
                      >
                        {availableFields.map((f) => {
                          const checked = includedFields.includes(f);
                          return (
                            <label
                              key={f}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 8px",
                                borderRadius: "999px",
                                border: checked
                                  ? `1px solid ${COLORS.primary}`
                                  : "1px solid #ccc",
                                backgroundColor: checked
                                  ? "#e3f2fd"
                                  : "#fafafa",
                                cursor: "pointer",
                              }}
                              onClick={handleToggleField(groupName, f)}
                            >
                              <input
                                type="checkbox"
                                readOnly
                                checked={checked}
                                style={{ margin: 0 }}
                              />
                              <span>{f}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </CopyableSection>
                  <CopyableSection
                    title="전형 결과별 총점 분포"
                    onRegisterSection={registerSectionForGroup}
                    sectionId="02_scoreScatter"
                    sectionType="그래프"
                    hideToolbar={isReportMode}
                  >
                    {!scatterPoints.length ||
                      !statsSnapshot.summaryStats ? (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#999",
                        }}
                      >
                        표시할 데이터가 없습니다.
                      </div>
                    ) : (
                      <GroupScoreScatterChart
                        groupName={groupName}
                        points={scatterPoints}
                        summaryStats={statsSnapshot.summaryStats}
                        chartWidthScale={chartWidthScale}
                        chartHeight={chartHeight}
                        showCartesianGrid={showCartesianGrid}
                        showLegend={showLegend}
                      />
                    )}

                  </CopyableSection>
                  {/* 요약 통계 + 전형 결과별 합/불 평균 2열 */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: "12px",
                      marginBottom: "8px",
                    }}
                  >
                    {/* 요약 통계 */}
                    <CopyableSection
                      title="요약 통계 (총점 기준)"
                      onRegisterSection={registerSectionForGroup}
                      sectionId="02_summaryStats"
                      sectionType="표"
                      hideToolbar={isReportMode}
                    >
                      <div style={{ fontSize: "13px" }}>
                        {totalScores.length === 0 ? (
                          <div style={{ color: "#999" }}>
                            총점 데이터가 없어 통계를 계산할 수 없습니다.
                          </div>
                        ) : (
                          <div
                            style={{
                              width: `${tableWidthScale}%`,
                              maxWidth: "100%",
                              overflowX: "auto",
                              resize: "horizontal",
                              display: "inline-block",
                            }}
                          >
                            <table
                              style={{
                                borderCollapse: "collapse",
                                width: "100%",
                              }}
                            >
                              <tbody>
                                {[
                                  [
                                    "최고점",
                                    Math.max(...totalScores).toFixed(2),
                                  ],
                                  [
                                    "최저점",
                                    Math.min(...totalScores).toFixed(2),
                                  ],
                                  [
                                    "합격자 기준 최저점 (커트라인)",
                                    cutoff !== null
                                      ? cutoff.toFixed(2)
                                      : "-",
                                  ],
                                  [
                                    "불합격자 기준 최고점",
                                    failScores.length
                                      ? Math.max(
                                        ...failScores
                                      ).toFixed(2)
                                      : "-",
                                  ],
                                  [
                                    "총점 평균",
                                    totalAvg !== null
                                      ? totalAvg.toFixed(2)
                                      : "-",
                                  ],
                                  [
                                    "총점 중앙값",
                                    totalMed !== null
                                      ? totalMed.toFixed(2)
                                      : "-",
                                  ],
                                  [
                                    "총점 표준편차",
                                    totalStd !== null
                                      ? totalStd.toFixed(2)
                                      : "-",
                                  ],
                                  [
                                    "합격컷 상위 %",
                                    cutoffPercent !== null
                                      ? cutoffPercent.toFixed(1)
                                      : "-",
                                  ],
                                ].map(([label, value], idx) => (
                                  <tr
                                    key={label}
                                    style={{
                                      backgroundColor:
                                        tableUseZebra && idx % 2 === 1
                                          ? zebraRowColor
                                          : "transparent",
                                    }}
                                  >
                                    <td
                                      style={{
                                        padding: "4px 8px",
                                        borderBottom:
                                          "1px solid #eee",
                                        borderRight: tableUseZebra
                                          ? `1px solid ${zebraBorderColor}`
                                          : "none",
                                      }}
                                    >
                                      {label}
                                    </td>
                                    <td
                                      style={{
                                        padding: "4px 8px",
                                        borderBottom:
                                          "1px solid #eee",
                                        textAlign: tableNumericAlign,
                                        borderRight: tableUseZebra
                                          ? `1px solid ${zebraBorderColor}`
                                          : "none",
                                      }}
                                    >
                                      {value}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                      <HtmlInterpretationEditor
                        label="요약 통계 해석"
                        value={groupInterpretations.summaryStats || ""}
                        onChange={(val) =>
                          setInterpretations((prev) => ({
                            ...prev,
                            perGroup: {
                              ...(prev.perGroup || {}),
                              [groupName]: {
                                ...(prev.perGroup?.[groupName] || {}),
                                summaryStats: val,
                              },
                            },
                          }))
                        }
                        readOnly={isReportMode}
                        compact
                        previewPayload={{
                          role:
                            "이 지원분야의 총점 분포(최고점, 최저점, 커트라인, 표준편차 등)를 요약적으로 해석할 때 사용하는 데이터입니다.",
                          scope: "group",
                          groupName,
                          data: statsSnapshot.summaryStats || null,
                        }}
                        autoConfig={
                          projectToken
                            ? {
                              projectName,
                              stageName,
                              section: "group_summaryStats",
                              groupName,
                              projectToken,
                            }
                            : null
                        }
                      />
                    </CopyableSection>

                    {/* 전형 결과별 총점 평균 (그래프) */}
                    <CopyableSection
                      title="전형 결과별 합/불 총점 평균"
                      onRegisterSection={registerSectionForGroup}
                      sectionId="03_phaseTotalAvg"
                      sectionType="그래프"
                      hideToolbar={isReportMode}
                    >
                      {phaseTotalAvgData.length === 0 ? (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#999",
                          }}
                        >
                          합격/불합격 구분 가능한 데이터가 없습니다.
                        </div>
                      ) : (
                        <div
                          style={{
                            width: `${chartWidthScale}%`,
                            maxWidth: "100%",
                            height: chartHeight,
                          }}
                        >
                          <ResponsiveContainer>
                            <BarChart
                              data={phaseTotalAvgData}
                              margin={{
                                top: 30,
                                right: 20,
                                left: 10,
                                bottom: 10,
                              }}
                            >
                              {showCartesianGrid && (
                                <CartesianGrid strokeDasharray="3 3" />
                              )}
                              <XAxis dataKey="phase" />
                              <YAxis />
                              <Tooltip />
                              {showLegend && <Legend />}
                              <Bar
                                dataKey="avg"
                                name="총점 평균"
                                fillOpacity={0.9}
                                barSize={barSize}
                              >
                                <LabelList
                                  dataKey="avg"
                                  position="top"
                                  formatter={formatLabelValue}
                                  style={{ fontSize: labelFontSize }}
                                />
                                {phaseTotalAvgData.map((d, idx) => (
                                  <Cell
                                    key={`cell-${idx}`}
                                    fill={
                                      d.phase === "합격"
                                        ? COLORS.primary
                                        : COLORS.secondary
                                    }
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      <HtmlInterpretationEditor
                        label="전형 결과별 합/불 총점 평균 해석"
                        value={groupInterpretations.phaseTotalAvg || ""}
                        onChange={(val) =>
                          setInterpretations((prev) => ({
                            ...prev,
                            perGroup: {
                              ...(prev.perGroup || {}),
                              [groupName]: {
                                ...(prev.perGroup?.[groupName] || {}),
                                phaseTotalAvg: val,
                              },
                            },
                          }))
                        }
                        readOnly={isReportMode}
                        compact
                        previewPayload={{
                          role:
                            "이 해석은 전형 결과별 합/불 총점 평균 막대그래프를 설명하기 위한 것입니다. " +
                            "data 배열의 각 원소는 { phase, avg } 구조이며, " +
                            "phase 필드는 '합격' 또는 '불합격' 집단을 나타내고, " +
                            "avg 필드는 해당 집단의 총점 평균(동일 점수 스케일에서의 평균값)을 의미합니다. ",
                          scope: "group",
                          groupName,
                          // 🔹 이 그래프에서 실제로 사용 중인 원본 데이터
                          data: phaseTotalAvgData,
                        }}
                        autoConfig={
                          projectToken
                            ? {
                              projectName,
                              stageName,
                              section: "group_phaseTotalAvg",
                              groupName,
                              projectToken,
                            }
                            : null
                        }
                      />
                    </CopyableSection>
                  </div>

                  {/* 평가항목별 합/불 평균 + 상관계수 */}
                  <CopyableSection
                    title="평가항목별 합/불 평균 및 합격 공헌도(상관계수)"
                    onRegisterSection={registerSectionForGroup}
                    sectionId="04_fieldStats"
                    sectionType="그래프"
                    hideToolbar={isReportMode}
                  >
                    {fieldStats.length === 0 ? (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#999",
                        }}
                      >
                        포함된 평가항목이 없습니다. 위에서 평가항목을
                        선택해 주세요.
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            width: `${tableWidthScale}%`,
                            maxWidth: "100%",
                            overflowX: "auto",
                            resize: "horizontal",
                            display: "inline-block",
                          }}
                        >
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: "12px",
                              marginBottom: "8px",
                            }}
                          >
                            <thead>
                              <tr>
                                {[
                                  "평가항목",
                                  "합격자 평균",
                                  "불합격자 평균",
                                  "합격 공헌도 (상관계수)",
                                ].map((label, idx) => (
                                  <th
                                    key={label}
                                    style={{
                                      borderBottom: `1px solid ${zebraBorderColor}`,
                                      textAlign:
                                        idx === 0
                                          ? "left"
                                          : tableNumericAlign,
                                      padding: "4px 8px",
                                      fontWeight: tableHeaderBold
                                        ? 600
                                        : 400,
                                      backgroundColor: tableHeaderBg,
                                      borderRight:
                                        tableUseZebra && idx !== 3
                                          ? `1px solid ${zebraBorderColor}`
                                          : "none",
                                    }}
                                  >
                                    {label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {fieldStats.map((fs, rowIndex) => (
                                <tr
                                  key={fs.field}
                                  style={{
                                    backgroundColor:
                                      tableUseZebra &&
                                        rowIndex % 2 === 1
                                        ? zebraRowColor
                                        : "transparent",
                                  }}
                                >
                                  <td
                                    style={{
                                      borderBottom: "1px solid #eee",
                                      padding: "4px 8px",
                                      borderRight: tableUseZebra
                                        ? `1px solid ${zebraBorderColor}`
                                        : "none",
                                    }}
                                  >
                                    {fs.field}
                                  </td>
                                  <td
                                    style={{
                                      borderBottom: "1px solid #eee",
                                      padding: "4px 8px",
                                      textAlign: tableNumericAlign,
                                      borderRight: tableUseZebra
                                        ? `1px solid ${zebraBorderColor}`
                                        : "none",
                                    }}
                                  >
                                    {fs.passAvg !== null
                                      ? fs.passAvg.toFixed(2)
                                      : "-"}
                                  </td>
                                  <td
                                    style={{
                                      borderBottom: "1px solid #eee",
                                      padding: "4px 8px",
                                      textAlign: tableNumericAlign,
                                      borderRight: tableUseZebra
                                        ? `1px solid ${zebraBorderColor}`
                                        : "none",
                                    }}
                                  >
                                    {fs.failAvg !== null
                                      ? fs.failAvg.toFixed(2)
                                      : "-"}
                                  </td>
                                  <td
                                    style={{
                                      borderBottom: "1px solid #eee",
                                      padding: "4px 8px",
                                      textAlign: tableNumericAlign,
                                    }}
                                  >
                                    {fs.corr !== null
                                      ? fs.corr.toFixed(3)
                                      : "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div
                          style={{
                            width: `${chartWidthScale}%`,
                            maxWidth: "100%",
                            height: chartHeight + 20,
                          }}
                        >
                          <ResponsiveContainer>
                            <BarChart
                              data={fieldChartData}
                              margin={{
                                top: 30,
                                right: 20,
                                left: 10,
                                bottom: 10,
                              }}
                            >
                              {showCartesianGrid && (
                                <CartesianGrid strokeDasharray="3 3" />
                              )}
                              <XAxis dataKey="field" />
                              <YAxis />
                              <Tooltip />
                              {showLegend && (
                                <Legend content={renderPassFailLegend} />
                              )}
                              <Bar
                                dataKey="passAvg"
                                name="합격자"
                                fill={COLORS.primary}
                                fillOpacity={0.9}
                                barSize={barSize}
                              >
                                <LabelList
                                  dataKey="passAvg"
                                  position="top"
                                  formatter={formatLabelValue}
                                  style={{ fontSize: labelFontSize }}
                                />
                              </Bar>
                              <Bar
                                dataKey="failAvg"
                                name="불합격자"
                                fill={COLORS.secondary}
                                fillOpacity={0.9}
                                barSize={barSize}
                              >
                                <LabelList
                                  dataKey="failAvg"
                                  position="top"
                                  formatter={formatLabelValue}
                                  style={{ fontSize: labelFontSize }}
                                />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    )}
                    <HtmlInterpretationEditor
                      label="평가항목별 합/불 평균 및 상관계수 해석"
                      value={groupInterpretations.fieldStats || ""}
                      onChange={(val) =>
                        setInterpretations((prev) => ({
                          ...prev,
                          perGroup: {
                            ...(prev.perGroup || {}),
                            [groupName]: {
                              ...(prev.perGroup?.[groupName] || {}),
                              fieldStats: val,
                            },
                          },
                        }))
                      }
                      readOnly={isReportMode}
                      compact
                      previewPayload={{
                        role:
                          "이 해석은 '평가항목별 합/불 평균 및 합격 공헌도(상관계수)' 표와 그래프를 설명하기 위한 것입니다. " +
                          "data 는 각 평가항목에 대한 요약 통계를 담은 배열이며, 각 원소는 { field, passAvg, failAvg, corr } 구조를 가집니다. " +
                          "• field: 평가항목 이름(예: 직무적합성, 경험·경력 등)으로, 표/그래프의 X축 라벨에 해당합니다. " +
                          "• passAvg: 해당 항목 점수의 '전형 합격자' 평균값으로, 합격 집단의 평균 수준을 나타냅니다. " +
                          "• failAvg: 해당 항목 점수의 '전형 불합격자' 평균값으로, 탈락 집단의 평균 수준을 나타냅니다. " +
                          "• corr: 항목 점수와 전형 합격 여부(합격=1, 불합격=0) 사이의 상관계수로, 값이 클수록 이 항목이 합격/불합격을 더 잘 구분해주는 지표임을 의미합니다. " +
                          "해석 시에는 passAvg와 failAvg의 격차가 큰 항목, corr 값이 높은 항목을 중심으로 '어떤 평가항목이 합격자를 가르는 핵심 요인인지'를 설명할 때 이 데이터를 사용합니다.",
                        scope: "group",
                        groupName,
                        // perGroupStats에 정리돼 있으면 그걸 우선 사용, 아니면 현재 계산된 fieldStats 사용
                        data: statsSnapshot.fieldStats || fieldStats,
                      }}
                      autoConfig={
                        projectToken
                          ? {
                            projectName,
                            stageName,
                            section: "group_fieldStats",
                            groupName,
                            projectToken,
                          }
                          : null
                      }
                    />
                  </CopyableSection>

                  {/* 최종 결과 비교 그래프 */}
                  <CopyableSection
                    title="채용 결과별 총점 비교"
                    onRegisterSection={registerSectionForGroup}
                    sectionId="05_finalCompare"
                    sectionType="그래프"
                    hideToolbar={isReportMode}
                  >
                    {finalCompareData.length === 0 ? (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#999",
                        }}
                      >
                        최종 합격자 또는 &quot;전형 합격 후 최종 불합격&quot;
                        데이터가 없습니다.
                      </div>
                    ) : (
                      <div
                        style={{
                          width: `${chartWidthScale}%`,
                          maxWidth: "100%",
                          height: chartHeight,
                        }}
                      >
                        <ResponsiveContainer>
                          <BarChart
                            data={finalCompareData}
                            margin={{
                              top: 30,
                              right: 20,
                              left: 10,
                              bottom: 10,
                            }}
                          >
                            {showCartesianGrid && (
                              <CartesianGrid strokeDasharray="3 3" />
                            )}
                            <XAxis dataKey="group" />
                            <YAxis />
                            <Tooltip />
                            {showLegend && <Legend />}
                            <Bar
                              dataKey="avg"
                              name="총점 평균"
                              fillOpacity={0.9}
                              barSize={barSize}
                            >
                              <LabelList
                                dataKey="avg"
                                position="top"
                                formatter={formatLabelValue}
                                style={{ fontSize: labelFontSize }}
                              />
                              {finalCompareData.map((d, idx) => (
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
                    )}
                    <HtmlInterpretationEditor
                      label="채용 결과별 총점 비교 해석"
                      value={groupInterpretations.finalCompare || ""}
                      onChange={(val) =>
                        setInterpretations((prev) => ({
                          ...prev,
                          perGroup: {
                            ...(prev.perGroup || {}),
                            [groupName]: {
                              ...(prev.perGroup?.[groupName] || {}),
                              finalCompare: val,
                            },
                          },
                        }))
                      }
                      readOnly={isReportMode}
                      compact
                      previewPayload={{
                        role:
                          "이 해석은 '채용 결과별 총점 비교' 그래프를 설명하기 위한 것입니다. " +
                          "data 배열의 각 원소는 { group, avg } 구조를 가지며, 각 필드의 의미는 다음과 같습니다.\n\n" +
                          "• group: 비교 대상 집단 라벨입니다.\n" +
                          "   - '최종 합격' : 해당 채용의 최종 합격자, 즉 실제 입사 대상 집단을 의미합니다.\n" +
                          "   - '최종 불합격(전형 합격)' : 해당 전형 단계에서는 합격했지만, 이후 마지막 단계(예: 최종면접 등)에서 최종 합격을 하지 못한 집단을 의미합니다.\n" +
                          "• avg: 각 group에 속한 인원들의 총점 평균으로, 동일한 점수 스케일에서 산출된 평균값입니다.\n\n",
                        scope: "group",
                        groupName,
                        // perGroupStats에 정리된 값이 있으면 우선 사용, 없으면 현재 계산 결과 사용
                        data: statsSnapshot.finalCompareData || finalCompareData,
                      }}
                      autoConfig={
                        projectToken
                          ? {
                            projectName,
                            stageName,
                            section: "group_finalCompare",
                            groupName,
                            projectToken,
                          }
                          : null
                      }
                    />
                  </CopyableSection>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
