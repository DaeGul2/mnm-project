// src/components/materials/ReportSection.js

import React from 'react';
import { FONT_PRESETS, COLORS } from './SharedStyles';

/**
 * ReportSection 컴포넌트: 보고서의 대제목(Section) 블록을 정의합니다.
 * 이 컴포넌트의 외부 Div가 드래그 가능한 최상위 영역이 됩니다.
 *
 * @param {object} props
 * @param {string} props.id - 섹션의 고유 ID
 * @param {string} props.title - 섹션의 대제목 (예: I. 전형 종합 분석 개요)
 * @param {object} props.style - 외부에서 주입되는 위치/크기 스타일
 * @param {function} props.onDragStart - 드래그 시작 핸들러 (ReportEditorPage에서 주입)
 * @param {React.ReactNode} props.children - 하위 요소 그룹들
 */
export default function ReportSection({ id, title, style, onDragStart, children }) {
  // 인라인 편집을 위한 더미 함수 (실제 구현 시 Draft.js 등으로 대체)
  const handleTitleClick = (e) => {
    e.stopPropagation();
    alert(`[${title}] 제목 편집 기능 구현 필요`);
  };

  return (
    // style은 ReportEditorPage의 shape 배열에서 계산된 x, y 기반의 절대 위치 스타일이 주입됩니다.
    <div
      id={id}
      onMouseDown={onDragStart} // 이 최상위 div를 드래그하여 전체 섹션을 이동합니다.
      style={{
        ...style,
        position: 'absolute', // ReportEditorPage에서 설정
        width: 'auto', // 섹션의 너비는 내부 콘텐츠에 맞게 또는 페이지에 고정되게 설정
        minWidth: '200px',
        cursor: 'grab',
        padding: '12px',
        border: `1px dashed ${COLORS.neutral}`, // 섹션 경계 시각화
        borderRadius: '8px',
        backgroundColor: '#fefefe',
      }}
    >
      {/* 1. 섹션 대제목 (H1) */}
      <h2 
        onClick={handleTitleClick}
        style={{ 
          ...FONT_PRESETS.H1_SECTION,
          borderBottom: `2px solid ${COLORS.primary}`,
          paddingBottom: '4px',
          cursor: 'text',
        }}
      >
        {title || '제목 없음'}
      </h2>

      {/* 2. 하위 요소 그룹 (ElementGroup) 렌더링 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
        {children}
      </div>
    </div>
  );
}