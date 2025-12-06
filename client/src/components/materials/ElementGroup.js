// src/components/materials/ElementGroup.js

import React from 'react';
import { FONT_PRESETS, COLORS } from './SharedStyles';

/**
 * ElementGroup 컴포넌트: 소제목, 시각화, 해석 등 여러 요소를 묶는 컨테이너입니다.
 * 이 컴포넌트의 외부 Div에 리사이즈 핸들 및 로직이 적용됩니다.
 *
 * @param {object} props
 * @param {string} props.id - 그룹의 고유 ID
 * @param {string} props.title - 소제목 (예: [표 1-1] 지원 분야별 합격률 현황)
 * @param {function} props.onResizeStart - 리사이즈 시작 핸들러 (ReportEditorPage에서 주입)
 * @param {React.ReactNode} props.children - 캡션, 표, 그래프, 해석 등의 기본 요소들
 */
export default function ElementGroup({ id, title, onResizeStart, children }) {
  // 인라인 편집을 위한 더미 함수
  const handleTitleClick = (e) => {
    e.stopPropagation();
    alert(`[${title}] 소제목 편집 기능 구현 필요`);
  };

  return (
    <div
      id={id}
      style={{
        padding: '10px',
        border: `1px solid #e5e7eb`,
        borderRadius: '4px',
        position: 'relative', // 리사이즈 핸들을 위한 기준점
        backgroundColor: '#ffffff',
      }}
    >
      {/* 1. 그룹 소제목 (H2) */}
      <h3 
        onClick={handleTitleClick}
        style={{ 
          ...FONT_PRESETS.H2_TITLE, 
          cursor: 'text',
          borderLeft: `3px solid ${COLORS.secondary}`,
          paddingLeft: '8px',
        }}
      >
        {title}
      </h3>

      {/* 2. 하위 기본 요소들 렌더링 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {children}
      </div>

      {/* 3. 리사이즈 핸들 (ReportEditorPage의 로직과 통합되어야 함) */}
      <div
        onMouseDown={onResizeStart} 
        style={{
          position: "absolute",
          right: -5,
          bottom: -5,
          width: 10,
          height: 10,
          borderRadius: "2px",
          backgroundColor: COLORS.primary,
          cursor: "nwse-resize",
          zIndex: 100, 
        }}
      />
    </div>
  );
}