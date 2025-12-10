// src/utils/step6StyleConfig.js

// 그래프 색상 팔레트
export const COLORS = {
  primary: "#1976d2", // 합격: 파란색
  secondary: "#8b1a3d", // 불합격: 버건디색
  muted: "#90a4ae", // 회청색 (보조용)
};

// 스타일 기본값 (표/그래프 관련 설정 한 번에 관리)
export const defaultStyleConfig = {
  barSize: 24,
  tableWidthScale: 100,
  chartWidthScale: 100,
  tableHeaderBold: true,
  tableHeaderBg: "#f5f5f5",
  tableUseZebra: true,
  zebraRowColor: "#edf2ff", // 지브라 행 배경 (더 진하게)
  zebraBorderColor: "#b0b7c9", // 지브라 세로줄 색 (더 선명)
  showCartesianGrid: true,
  showLegend: true,
  chartHeight: 260,
  labelFontSize: 11,
  tableNumericAlign: "right",
};
