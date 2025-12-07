// src/components/materials/SharedStyles.js

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
} from 'recharts';

export const COLORS = {
  primary: "#1976d2",
  secondary: "#8b1a3d",
  highlight: "#fcd34d", // 강조색 (Callout Block 등에 사용)
  neutral: "#4b5563",
};

// 텍스트 편집기 스타일 프리셋
export const FONT_PRESETS = {
  H1_SECTION: { fontSize: "20px", fontWeight: 700, color: COLORS.neutral, margin: "16px 0 8px" },
  H2_TITLE: { fontSize: "16px", fontWeight: 600, color: COLORS.neutral, margin: "12px 0 6px" },
  BODY_NORMAL: { fontSize: "11px", lineHeight: "1.5", color: "#374151", margin: "4px 0" },
  CAPTION_SMALL: { fontSize: "10px", color: "#6b7280", fontStyle: "italic", margin: "4px 0 8px" },
};

/**
 * Recharts를 위한 기본 컴포넌트와 설정을 반환합니다.
 * ReportEditorPage.js에서 가져온 Recharts 컴포넌트들을 재사용합니다.
 */
export const RechartsComponents = {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Cell
};

/* 중첩된 객체에서 데이터 경로(dataKey)를 사용하여 값을 가져오는 유틸리티 함수
 * @param {object} obj - 대상 객체 (예: calc.stats)
 * @param {string} path - 키 경로 (예: 'perGroup.경영기획.fieldStats')
 */
export function getNestedData(obj, path) {
  if (!obj || !path) return null;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return null;
    current = current[key];
  }
  return current;
}
/**
 * 숫자를 소수점 두 자리까지 포맷팅하거나, null/undefined를 처리합니다.
 */
export function formatNumber(value, fixed = 2) {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  if (typeof value === 'number') {
    // [수정]: 'path' 변수가 정의되지 않아 발생한 오류를 수정하기 위해 
    // 키에 의존하는 조건문(path.includes...)을 제거하고 일반 포맷팅만 남깁니다.
    return value.toFixed(fixed);
  }
  return value; // 문자열 등 다른 타입은 그대로 반환
}

// 숫자를 소수점 두 자리까지 포맷팅하거나, null/undefined를 처리하는 최종 포맷 함수
export function formatTableValue(value, key) {
  if (value === null || value === undefined || isNaN(value)) return '-';
  if (typeof value === 'number') {
    // passRate나 cutoffPercent는 %로 표시
    if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('percent')) {
      return `${value.toFixed(1)}%`;
    }
    // corr(상관계수)는 소수점 4자리
    if (key.toLowerCase().includes('corr')) {
        return value.toFixed(4);
    }
    // 평균(avg) 점수 등은 소수점 2자리
    return value.toFixed(2);
  }
  return value;
}