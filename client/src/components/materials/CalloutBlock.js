// src/components/materials/CalloutBlock.js

import React, { useState } from 'react';
import { FONT_PRESETS, COLORS } from './SharedStyles';

/**
 * CalloutBlock 컴포넌트: 핵심 수치(KPI)를 강조하여 표시합니다.
 *
 * @param {object} props
 * @param {string} props.label - 수치에 대한 설명 (예: "경영기획 합격률")
 * @param {string} props.value - 강조할 수치 값 (문자열 또는 숫자)
 * @param {string} props.unit - 단위 (예: "점", "%")
 */
export default function CalloutBlock({ label, value: initialValue, unit }) {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);

  const handleDoubleClick = () => setIsEditing(true);
  const handleBlur = () => setIsEditing(false);

  const blockStyle = {
    padding: '20px',
    backgroundColor: '#fff7ed', // 밝은 배경
    border: `1px solid ${COLORS.highlight}`,
    borderRadius: '8px',
    textAlign: 'center',
  };

  const valueStyle = {
    fontSize: '32px',
    fontWeight: 800,
    color: COLORS.secondary,
    lineHeight: 1.2,
    cursor: isEditing ? 'auto' : 'pointer',
  };
  
  const labelStyle = {
    ...FONT_PRESETS.BODY_NORMAL,
    fontWeight: 600,
    marginTop: '5px',
    color: COLORS.neutral,
  };

  return (
    <div style={blockStyle}>
      <div 
        style={valueStyle}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            autoFocus
            style={{
              fontSize: '32px',
              fontWeight: 800,
              width: '100px',
              textAlign: 'center',
              border: `1px dashed ${COLORS.primary}`,
            }}
          />
        ) : (
          <span>{value}{unit}</span>
        )}
      </div>
      <div style={labelStyle}>
        {label}
      </div>
    </div>
  );
}