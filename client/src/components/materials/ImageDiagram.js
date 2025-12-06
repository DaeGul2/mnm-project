// src/components/materials/ImageDiagram.js

import React, { useState } from 'react';
import { FONT_PRESETS, COLORS } from './SharedStyles';

/**
 * ImageDiagram 컴포넌트: 이미지나 다이어그램을 삽입합니다.
 *
 * @param {object} props
 * @param {string} props.initialUrl - 이미지 URL
 * @param {boolean} [props.aspectLock=true] - 가로세로 비율 고정 여부
 */
export default function ImageDiagram({ initialUrl, aspectLock = true }) {
  const [url, setUrl] = useState(initialUrl);
  const [isEditing, setIsEditing] = useState(false);
  
  const handleDoubleClick = () => setIsEditing(true);
  const handleBlur = () => setIsEditing(false);

  // 이미지 스타일: 리사이즈가 외부 ElementGroup에서 이루어지므로, 너비 100%
  const imgStyle = {
    width: '100%',
    height: 'auto',
    display: 'block',
    border: `1px solid ${COLORS.neutral}`,
    objectFit: 'contain',
  };

  return (
    <div style={{ padding: '5px 0' }}>
      {isEditing ? (
        <div style={{ padding: '10px', border: `1px dashed ${COLORS.primary}` }}>
          <p style={{ ...FONT_PRESETS.CAPTION_SMALL, margin: 0 }}>
            이미지 URL 입력:
          </p>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={handleBlur}
            autoFocus
            style={{ 
              width: '100%', 
              padding: '4px', 
              boxSizing: 'border-box',
              ...FONT_PRESETS.BODY_NORMAL 
            }}
          />
        </div>
      ) : (
        <img 
          src={url} 
          alt="Report Diagram" 
          style={imgStyle} 
          onDoubleClick={handleDoubleClick}
          onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/300x150?text=Image+Not+Found"; }}
        />
      )}
      <p style={{ ...FONT_PRESETS.CAPTION_SMALL, textAlign: 'center', marginTop: '4px' }}>
        {aspectLock ? '비율 고정됨' : '비율 고정 해제됨'}
      </p>
    </div>
  );
}