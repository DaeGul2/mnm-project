// src/components/materials/InterpretationBox.js

import React, { useState } from 'react';
import { FONT_PRESETS, COLORS } from './SharedStyles';

/**
 * InterpretationBox 컴포넌트: GPT가 생성한 해석 텍스트 블록입니다.
 * 텍스트 인라인 편집을 지원합니다.
 *
 * @param {object} props
 * @param {string} props.initialText - GPT가 생성한 초기 해석 텍스트
 * @param {string} [props.boxStyle='default'] - 박스 스타일 프리셋
 * @param {function} props.onTextChange - 텍스트 변경 시 콜백 함수
 */
export default function InterpretationBox({ initialText, boxStyle = 'default', onTextChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentText, setCurrentText] = useState(initialText);

  // 더블 클릭 시 편집 모드 활성화
  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  // 포커스 아웃 시 편집 모드 비활성화 및 변경 사항 저장
  const handleBlur = () => {
    setIsEditing(false);
    if (onTextChange) {
      onTextChange(currentText);
    }
  };

  const boxStyles = {
    default: {
      padding: '8px 10px',
      backgroundColor: '#f9fafb',
      border: `1px solid #e5e7eb`,
      borderRadius: '4px',
    },
    highlight: {
      padding: '12px 15px',
      backgroundColor: '#fffbeb', // 노란색 계열 강조
      borderLeft: `4px solid ${COLORS.highlight}`,
      borderRadius: '4px',
    },
  };

  return (
    <div 
      style={{
        ...boxStyles[boxStyle],
        ...FONT_PRESETS.BODY_NORMAL,
        cursor: isEditing ? 'auto' : 'pointer',
      }}
      onDoubleClick={handleDoubleClick}
    >
      <h4 style={{ ...FONT_PRESETS.BODY_NORMAL, fontWeight: 700, margin: '0 0 4px 0', color: COLORS.neutral }}>
        해석 및 시사점
      </h4>
      
      {isEditing ? (
        <textarea
          value={currentText}
          onChange={(e) => setCurrentText(e.target.value)}
          onBlur={handleBlur}
          autoFocus
          style={{
            width: '100%',
            minHeight: '80px',
            border: `1px dashed ${COLORS.primary}`,
            padding: '4px',
            ...FONT_PRESETS.BODY_NORMAL,
            boxSizing: 'border-box',
            resize: 'vertical',
          }}
        />
      ) : (
        // 줄바꿈이 적용되도록 pre-wrap 사용
        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
          {currentText}
        </p>
      )}
    </div>
  );
}