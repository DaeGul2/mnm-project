// src/components/materials/PlainText.js

import React, { useState } from 'react';
import { FONT_PRESETS, COLORS } from './SharedStyles';

/**
 * PlainText 컴포넌트: 섹션 도입부 등 자유로운 텍스트 본문 영역입니다.
 *
 * @param {object} props
 * @param {string} props.initialText - 초기 텍스트
 * @param {function} props.onTextChange - 텍스트 변경 시 콜백 함수
 */
export default function PlainText({ initialText, onTextChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentText, setCurrentText] = useState(initialText);

  const handleDoubleClick = () => setIsEditing(true);
  
  const handleBlur = () => {
    setIsEditing(false);
    if (onTextChange) {
      onTextChange(currentText);
    }
  };

  return (
    <div 
      style={{
        ...FONT_PRESETS.BODY_NORMAL,
        padding: '5px 0',
        cursor: isEditing ? 'auto' : 'pointer',
      }}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          value={currentText}
          onChange={(e) => setCurrentText(e.target.value)}
          onBlur={handleBlur}
          autoFocus
          style={{
            width: '100%',
            minHeight: '50px',
            border: `1px dashed ${COLORS.primary}`,
            padding: '4px',
            ...FONT_PRESETS.BODY_NORMAL,
            boxSizing: 'border-box',
            resize: 'vertical',
          }}
        />
      ) : (
        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
          {currentText}
        </p>
      )}
    </div>
  );
}