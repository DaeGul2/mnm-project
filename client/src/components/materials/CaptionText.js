// src/components/materials/CaptionText.js

import React, { useState } from 'react';
import { FONT_PRESETS, COLORS } from './SharedStyles';

/**
 * CaptionText 컴포넌트: 표나 그래프에 대한 캡션(설명)을 표시하고 인라인 편집을 지원합니다.
 *
 * @param {object} props
 * @param {string} props.initialText - 초기 캡션 텍스트 (GPT 생성)
 * @param {string} [props.figureIndex='1-1'] - 표/그림 번호 (자동 또는 수동)
 * @param {function} props.onTextChange - 텍스트 변경 시 콜백 함수
 */
export default function CaptionText({ initialText, figureIndex = '1-1', onTextChange }) {
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
        ...FONT_PRESETS.CAPTION_SMALL,
        padding: '2px 0',
        cursor: isEditing ? 'auto' : 'pointer',
      }}
      onDoubleClick={handleDoubleClick}
    >
      <span style={{ fontWeight: 600, color: COLORS.neutral }}>
        [{figureIndex}]&nbsp;
      </span>
      {isEditing ? (
        <input
          type="text"
          value={currentText}
          onChange={(e) => setCurrentText(e.target.value)}
          onBlur={handleBlur}
          autoFocus
          style={{
            width: 'calc(100% - 40px)', // 인덱스 공간 확보
            border: `1px dashed ${COLORS.primary}`,
            ...FONT_PRESETS.CAPTION_SMALL,
            padding: '2px',
          }}
        />
      ) : (
        <span>{currentText}</span>
      )}
    </div>
  );
}