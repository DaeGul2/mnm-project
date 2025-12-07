// src/components/materials/GroupSection.js
import React, { useMemo } from "react";

// 내부 블록 타입 정의
export const GROUP_BLOCK_TYPES = {
  TITLE: "TITLE", // 0. 타이틀 (별도 블록이 아닌 섹션의 기본 요소로 처리)
  SUMMARY_STATS: "SUMMARY_STATS", // 1. 요약 통계 - 총점기준
  PHASE_AVG_TOTAL: "PHASE_AVG_TOTAL", // 2. 전형 결과별 합/불 총점 평균
  FIELD_CONTRIBUTION: "FIELD_CONTRIBUTION", // 3. 평가항목별 합/불 평균 및 합격 공헌도
  FINAL_COMPARE: "FINAL_COMPARE", // 4. 채용 결과별 총점 비교
  INTERPRETATION: "INTERPRETATION", // 5. 해당 '분야'의 전형 결과에 대한 해석
};

// ===================================================================
// 하위 컴포넌트 Placeholder (실제 데이터 및 차트 렌더링은 생략)
// ===================================================================

/**
 * 캡션 렌더링 컴포넌트 (텍스트 직접 수정 가능)
 */
function Caption({ caption, scaleFactor, blockId, onChangeCaption, blockType }) {
  const captionFontSize = (12 * scaleFactor) / 100;
  
  // 캡션 레이블 정의
  let label = '';
  switch (blockType) {
    case GROUP_BLOCK_TYPES.SUMMARY_STATS:
      label = "표 2-1."; break;
    case GROUP_BLOCK_TYPES.PHASE_AVG_TOTAL:
    case GROUP_BLOCK_TYPES.FINAL_COMPARE:
      label = "그림 2-X."; break;
    case GROUP_BLOCK_TYPES.FIELD_CONTRIBUTION:
      label = "표 2-2."; break;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
      <span style={{ fontSize: captionFontSize, fontWeight: 600, minWidth: 50 * scaleFactor }}>
        {label}
      </span>
      <input
        type="text"
        value={caption}
        onChange={(e) => onChangeCaption(blockId, "caption", e.target.value)}
        style={{
          flex: 1,
          fontSize: captionFontSize,
          fontWeight: 500,
          border: 'none',
          borderBottom: '1px dashed #d1d5db',
          padding: 0,
          background: 'transparent'
        }}
        placeholder="캡션을 입력하세요."
      />
    </div>
  );
}

/**
 * 하위 블록: 요약 통계 테이블 (Summary Stats)
 */
function SummaryStatsBlock({ data, config, scaleFactor }) {
  const tableFontSize = (12 * config.tableScale * scaleFactor) / 100;
  const stats = data?.summaryStats;
  
  return (
    <div style={{ padding: 10 * scaleFactor, border: '1px solid #e5e7eb', borderRadius: 4 * scaleFactor }}>
      <div style={{ fontSize: tableFontSize, fontWeight: 600, marginBottom: 5 * scaleFactor }}>
        [표 컴포넌트: 총점 기준 요약 통계]
      </div>
      <div style={{ fontSize: tableFontSize * 0.8, color: '#666' }}>
        총 지원자: **{stats?.n || 0}명**, 합격률: **{(stats?.passRate || 0).toFixed(2)}%**, 평균 총점: **{(stats?.avgTotal || 0).toFixed(2)}점**
      </div>
    </div>
  );
}

// 나머지 하위 블록들은 Placeholder로 정의
function PhaseAvgTotalBlock({ data, scaleFactor }) {
    return <div style={{ padding: 20 * scaleFactor, border: '1px dashed #ddd' }}>[📊 차트/표: 전형 결과별 합/불 총점 평균]</div>;
}
function FieldContributionBlock({ data, scaleFactor }) {
    return <div style={{ padding: 20 * scaleFactor, border: '1px dashed #ddd' }}>[📊 차트/표: 평가 항목별 합격 공헌도]</div>;
}
function FinalCompareBlock({ data, scaleFactor }) {
    return <div style={{ padding: 20 * scaleFactor, border: '1px dashed #ddd' }}>[📊 차트/표: 채용 결과별 총점 비교]</div>;
}

/**
 * 하위 블록: 전형 결과에 대한 해석 (Interpretation)
 */
function InterpretationBlock({ config, scaleFactor, blockId, onChangeCaption }) {
    const textFontSize = (12 * config.textScale * scaleFactor) / 100;
    
    return (
        <div style={{ padding: 10 * scaleFactor, backgroundColor: '#f9fafb', borderRadius: 4 * scaleFactor }}>
            <div style={{ fontSize: (14 * scaleFactor) / 100, fontWeight: 700, marginBottom: 5 * scaleFactor }}>
                전형 결과 해석
            </div>
            <textarea
                value={config.text || ""}
                onChange={(e) => onChangeCaption(blockId, "text", e.target.value)}
                placeholder="해당 분야의 전형 결과에 대한 상세 해석을 작성하세요."
                style={{
                    width: "100%",
                    minHeight: 80 * scaleFactor,
                    resize: "vertical",
                    fontSize: textFontSize,
                    padding: 8 * scaleFactor,
                    border: "1px dashed #e5e7eb",
                    borderRadius: 4 * scaleFactor
                }}
            />
        </div>
    );
}

// ===================================================================
// 메인 컴포넌트: GroupSection
// ===================================================================

/**
 * 지원 분야별 상세 분석 섹션 컴포넌트
 */
function GroupSection({ groupName, groupData, config = {}, onChangeConfig, onEditClick }) {
  const mergedConfig = useMemo(
    () => ({
      sectionScale: 100,
      titleScale: 100,
      tableScale: 100,
      textScale: 100,
      titleBold: groupName,
      titlePlain: "지원분야 결과 분석",
      contentBlocks: [], // 실제 블록 목록은 ReportEditorPage에서 기본값으로 설정
      ...config,
    }),
    [config, groupName]
  );
  
  const sectionScaleFactor = mergedConfig.sectionScale / 100;
  const titleScaleFactor = (mergedConfig.titleScale / 100) * sectionScaleFactor;
  const titleFontSize = (18 * titleScaleFactor) / 100; 

  // 내부 블록의 캡션/텍스트 변경 핸들러 (config 업데이트)
  const handleChangeBlockConfig = (blockId, field, value) => {
    const nextContentBlocks = mergedConfig.contentBlocks.map(block => 
      block.id === blockId ? { ...block, [field]: value } : block
    );
    onChangeConfig({ ...mergedConfig, contentBlocks: nextContentBlocks });
  };

  // 블록 타입에 따른 컴포넌트 맵핑
  const BlockComponents = {
    [GROUP_BLOCK_TYPES.SUMMARY_STATS]: SummaryStatsBlock,
    [GROUP_BLOCK_TYPES.PHASE_AVG_TOTAL]: PhaseAvgTotalBlock,
    [GROUP_BLOCK_TYPES.FIELD_CONTRIBUTION]: FieldContributionBlock,
    [GROUP_BLOCK_TYPES.FINAL_COMPARE]: FinalCompareBlock,
    [GROUP_BLOCK_TYPES.INTERPRETATION]: InterpretationBlock,
  };
  
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "4px",
        padding: 12 * sectionScaleFactor,
        margin: "16px 0",
        position: "relative",
        background: '#fff'
      }}
    >
      {/* 설정 버튼 */}
      <button
        onClick={onEditClick}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: "#fff",
          border: "1px solid #ccc",
          borderRadius: "4px",
          padding: "4px 8px",
          fontSize: "10px",
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        ⚙️ 설정
      </button>

      {/* 0. 타이틀 (중제목 - 소제목) */}
      <h2
        style={{
          fontSize: titleFontSize,
          fontWeight: 700,
          marginBottom: 10 * sectionScaleFactor,
        }}
      >
        <span style={{ fontWeight: 900, color: mergedConfig.titleColor || '#222' }}>
          {mergedConfig.titleBold}
        </span>{" "}
        {mergedConfig.titlePlain}
      </h2>
      
      {/* 1~5. 하위 컨텐츠 블록들 (config.contentBlocks 순서대로 렌더링) */}
      {mergedConfig.contentBlocks.filter(block => block.isVisible !== false).map((block) => {
        const BlockComponent = BlockComponents[block.type];
        
        if (!BlockComponent) return null;
        
        return (
          <div key={block.id} style={{ marginBottom: 16 * sectionScaleFactor }}>
            
            {/* 캡션 (해석 블록 제외) */}
            {block.type !== GROUP_BLOCK_TYPES.INTERPRETATION && block.caption && (
                <Caption 
                    caption={block.caption} 
                    scaleFactor={titleScaleFactor} 
                    onChangeCaption={handleChangeBlockConfig}
                    blockId={block.id}
                    blockType={block.type}
                />
            )}

            {/* 메인 컨텐츠 컴포넌트 */}
            <BlockComponent
              data={groupData}
              config={mergedConfig} // 섹션 스케일 등은 전체 config를 사용
              scaleFactor={sectionScaleFactor}
              blockId={block.id}
              // 해석 블록은 텍스트 편집이 가능해야 하므로 전용 핸들러 전달
              onChangeCaption={block.type === GROUP_BLOCK_TYPES.INTERPRETATION ? handleChangeBlockConfig : undefined} 
            />
          </div>
        );
      })}
    </div>
  );
}

export default GroupSection;