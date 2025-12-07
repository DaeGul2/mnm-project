// src/components/materials/GroupConfigModal.js
import React, { useState, useEffect, useMemo } from "react";
import { GROUP_BLOCK_TYPES } from "./GroupSection"; // GroupSection에서 블록 타입 임포트

// 배열 재정렬 유틸리티
const reorderArray = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  if (endIndex < 0 || endIndex >= result.length) return result;
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

// 블록 타입별 표시 이름 맵핑
const BLOCK_NAMES = {
  [GROUP_BLOCK_TYPES.SUMMARY_STATS]: "1. 요약 통계",
  [GROUP_BLOCK_TYPES.PHASE_AVG_TOTAL]: "2. 전형 총점 평균 (차트)",
  [GROUP_BLOCK_TYPES.FIELD_CONTRIBUTION]: "3. 평가항목별 공헌도 (표/차트)",
  [GROUP_BLOCK_TYPES.FINAL_COMPARE]: "4. 채용 결과별 총점 비교 (차트)",
  [GROUP_BLOCK_TYPES.INTERPRETATION]: "5. 전형 결과에 대한 해석 (텍스트)",
};

/**
 * GroupSection의 설정 모달 컴포넌트입니다.
 */
function GroupConfigModal({
  isOpen,
  onClose,
  initialConfig,
  groupName,
  onSave,
}) {
  const [localConfig, setLocalConfig] = useState(initialConfig);

  useEffect(() => {
    // 모달이 열릴 때마다 초기 설정을 로드합니다.
    setLocalConfig(initialConfig);
  }, [initialConfig, isOpen]);

  // 설정 저장 핸들러
  const handleSave = () => {
    onSave(localConfig);
  };
  
  // 일반 설정 (제목, 스케일) 변경 핸들러
  const handleChange = (field, value) => {
    setLocalConfig((prev) => ({ ...prev, [field]: value }));
  };

  // 하위 블록의 순서 변경 핸들러
  const handleMoveBlock = (index, direction) => {
    const nextContentBlocks = reorderArray(
      localConfig.contentBlocks,
      index,
      index + direction
    );
    handleChange("contentBlocks", nextContentBlocks);
  };

  // 하위 블록의 캡션/표시 여부 변경 핸들러
  const handleBlockChange = (blockId, field, value) => {
    const nextContentBlocks = localConfig.contentBlocks.map((block) =>
      block.id === blockId ? { ...block, [field]: value } : block
    );
    handleChange("contentBlocks", nextContentBlocks);
  };
  
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: "20px",
          borderRadius: "8px",
          width: "600px",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <h2 style={{ borderBottom: "1px solid #eee", paddingBottom: "10px", marginBottom: "15px" }}>
          **{groupName}** 섹션 설정
        </h2>

        {/* 1. 제목 및 스케일 설정 */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>섹션 기본 설정 (0. 타이틀)</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <label style={{ flex: 1 }}>굵은 제목: 
              <input type="text" value={localConfig.titleBold} onChange={(e) => handleChange('titleBold', e.target.value)} style={{ width: '100%', padding: '5px' }} />
            </label>
            <label style={{ flex: 1 }}>일반 제목: 
              <input type="text" value={localConfig.titlePlain} onChange={(e) => handleChange('titlePlain', e.target.value)} style={{ width: '100%', padding: '5px' }} />
            </label>
          </div>
          <label style={{ display: 'block', marginBottom: '10px' }}>전체 스케일 (50~150%): 
            <input type="number" min="50" max="150" value={localConfig.sectionScale} onChange={(e) => handleChange('sectionScale', parseInt(e.target.value))} style={{ width: '80px', padding: '5px' }} />
          </label>
        </div>
        
        {/* 2. 하위 블록 순서 및 설정 */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "16px", marginBottom: "10px", borderTop: "1px solid #eee", paddingTop: "10px" }}>
            하위 컴포넌트 순서 및 설정 (위치 자유롭게 이동)
          </h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {localConfig.contentBlocks.map((block, index) => (
              <li
                key={block.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid #ddd",
                  padding: "10px",
                  marginBottom: "8px",
                  borderRadius: "4px",
                  backgroundColor: block.isVisible === false ? '#f0f0f0' : '#fff'
                }}
              >
                {/* 순서 이동 버튼 */}
                <div style={{ marginRight: "10px", display: 'flex', flexDirection: 'column' }}>
                  <button onClick={() => handleMoveBlock(index, -1)} disabled={index === 0} style={{ padding: '2px 5px', marginBottom: '2px' }}>▲</button>
                  <button onClick={() => handleMoveBlock(index, 1)} disabled={index === localConfig.contentBlocks.length - 1} style={{ padding: '2px 5px' }}>▼</button>
                </div>
                
                {/* 블록 상세 설정 */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '5px', color: '#2563eb' }}>
                    {BLOCK_NAMES[block.type]}
                  </div>
                  {block.type !== GROUP_BLOCK_TYPES.INTERPRETATION && (
                    <label style={{ fontSize: '12px', display: 'block' }}>
                      캡션:
                      <input 
                        type="text" 
                        value={block.caption || ''} 
                        onChange={(e) => handleBlockChange(block.id, 'caption', e.target.value)} 
                        style={{ width: '90%', padding: '3px', marginLeft: '5px' }} 
                      />
                    </label>
                  )}
                  {block.type === GROUP_BLOCK_TYPES.INTERPRETATION && (
                    <label style={{ fontSize: '12px', display: 'block' }}>
                      기본 텍스트:
                      <input 
                        type="text" 
                        value={block.text || ''} 
                        onChange={(e) => handleBlockChange(block.id, 'text', e.target.value)} 
                        style={{ width: '90%', padding: '3px', marginLeft: '5px' }} 
                      />
                    </label>
                  )}
                </div>

                {/* 표시 여부 토글 */}
                <div style={{ marginLeft: "10px", textAlign: 'center', width: '60px' }}>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>표시</label>
                    <input 
                        type="checkbox" 
                        checked={block.isVisible !== false}
                        onChange={(e) => handleBlockChange(block.id, 'isVisible', e.target.checked)}
                        style={{ transform: 'scale(1.2)' }}
                    />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* 푸터 버튼 */}
        <div style={{ textAlign: "right", borderTop: "1px solid #eee", paddingTop: "15px" }}>
          <button
            onClick={onClose}
            style={{ padding: "8px 16px", borderRadius: "4px", border: "1px solid #d1d5db", backgroundColor: "#fff", cursor: "pointer", marginRight: "8px" }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            style={{ padding: "8px 16px", borderRadius: "4px", border: "1px solid #2563eb", backgroundColor: "#2563eb", color: "#fff", cursor: "pointer" }}
          >
            설정 저장
          </button>
        </div>
      </div>
    </div>
  );
}

export default GroupConfigModal;