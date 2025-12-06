// src/components/materials/StatTable.js

import React from 'react';
import { FONT_PRESETS, COLORS, getNestedData, formatTableValue } from './SharedStyles';

/**
 * StatTable 컴포넌트: calc 데이터의 배열을 표 형태로 렌더링합니다.
 *
 * @param {object} props
 * @param {object} props.calcData - 전체 Step6 계산 결과 (calc.stats)
 * @param {string} props.dataKey - calcData 내부에서 테이블 데이터의 경로 (예: 'perGroup.경영기획.fieldStats' 또는 'crossGroupSummary')
 * @param {string[]} [props.displayKeys] - 테이블에 표시할 열의 키를 수동으로 지정 (선택 사항)
 */
export default function StatTable({ calcData, dataKey, displayKeys }) {
  const data = getNestedData(calcData, dataKey) || [];

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontSize: '11px', color: COLORS.secondary }}>
        데이터 경로 ({dataKey})에서 유효한 테이블 데이터를 찾을 수 없습니다.
      </div>
    );
  }

  // 1. 헤더 (열) 결정: 첫 번째 데이터 객체의 키를 사용하거나, displayKeys를 사용
  const allKeys = displayKeys || Object.keys(data[0]);

  // 키를 한국어 이름으로 변환하는 매핑 (GPT가 이 역할을 수행하지만, 컴포넌트 내 기본값)
  const keyMapping = {
    field: '평가 항목',
    corr: '합격 공헌도 (상관계수)',
    failAvg: '불합격 평균',
    passAvg: '합격 평균',
    groupName: '지원 분야',
    n: '총 인원',
    cutoff: '커트라인 평균',
    avgTotal: '전체 총점 평균',
    passRate: '합격률',
    cutoffPercent: '커트라인 비율',
    avg: '평균 점수',
    group: '최종 결과'
    // 필요에 따라 추가
  };
  
  const headers = allKeys.map(key => keyMapping[key] || key);

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    ...FONT_PRESETS.BODY_NORMAL,
    fontSize: '10px',
  };

  const thStyle = {
    border: '1px solid #ccc',
    padding: '6px',
    textAlign: 'center',
    backgroundColor: COLORS.primary,
    color: 'white',
    fontWeight: 700,
  };

  const tdStyle = {
    border: '1px solid #ddd',
    padding: '6px',
    textAlign: 'center',
  };
  
  // 데이터 행의 렌더링
  const renderRow = (item, index) => (
    <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
      {allKeys.map((key) => (
        <td key={key} style={tdStyle}>
          {formatTableValue(item[key], key)}
        </td>
      ))}
    </tr>
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index} style={thStyle}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(renderRow)}
        </tbody>
      </table>
    </div>
  );
}