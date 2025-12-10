// src/components/wizard/Step6SharedComponents.js
import React, { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { defaultStyleConfig } from "../../utils/step6StyleConfig";

// 클립보드로 "이미지 복사" 버튼
function CopyAsImageButton({ targetRef, label = "클립보드 복사" }) {
    const handleCopy = async () => {
        const node = targetRef?.current;
        if (!node) {
            alert("복사할 영역을 찾을 수 없습니다.");
            return;
        }
        try {
            const canvas = await html2canvas(node, { scale: 2 });
            const blob = await new Promise((resolve) =>
                canvas.toBlob(resolve, "image/png")
            );
            if (!blob) {
                alert("이미지 변환에 실패했습니다.");
                return;
            }

            const clipboard = navigator.clipboard;
            const ClipboardItemCtor = window.ClipboardItem;

            if (clipboard && clipboard.write && ClipboardItemCtor) {
                try {
                    const item = new ClipboardItemCtor({ [blob.type]: blob });
                    await clipboard.write([item]);
                    alert(
                        "이미지 형태로 클립보드에 복사했습니다. (Ctrl+V로 붙여넣기)"
                    );
                } catch (err) {
                    console.error(err);
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank");
                }
            } else {
                const url = URL.createObjectURL(blob);
                window.open(url, "_blank");
            }
        } catch (err) {
            console.error(err);
            alert("이미지 복사 중 오류가 발생했습니다.");
        }
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            style={{
                padding: "4px 10px",
                borderRadius: "999px",
                border: "1px solid #666",
                backgroundColor: "#fff",
                fontSize: "11px",
                cursor: "pointer",
            }}
        >
            📋 {label}
        </button>
    );
}

// 🔹 해석 옆 "데이터 미리보기" 버튼 + 툴팁
function DataPreviewTooltipButton({ payload }) {
    const [open, setOpen] = useState(false);

    if (!payload) return null;

    const prettyJson = JSON.stringify(payload, null, 2);

    return (
        <div style={{ position: "relative", display: "inline-block" }}>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                style={{
                    padding: "3px 8px",
                    borderRadius: "999px",
                    border: "1px solid #64748b",
                    backgroundColor: "#fff",
                    fontSize: "10px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                }}
            >
                📊 데이터 미리보기
            </button>
            {open && (
                <div
                    style={{
                        position: "absolute",
                        right: 0,
                        top: "120%",
                        zIndex: 3000,
                        width: 360,
                        maxWidth: "80vw",
                        maxHeight: 360,
                        overflow: "auto",
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#0f172a",
                        color: "#e2e8f0",
                        boxShadow: "0 8px 18px rgba(15,23,42,0.4)",
                        fontSize: "11px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 4,
                            gap: 6,
                        }}
                    >
                        <span style={{ fontWeight: 600 }}>해석용 데이터 미리보기</span>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            style={{
                                border: "none",
                                background: "none",
                                color: "#cbd5e1",
                                cursor: "pointer",
                                fontSize: "11px",
                            }}
                        >
                            닫기 ✕
                        </button>
                    </div>
                    <pre
                        style={{
                            margin: 0,
                            whiteSpace: "pre",
                            fontFamily:
                                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        }}
                    >
                        {prettyJson}
                    </pre>
                </div>
            )}
        </div>
    );
}



// 특정 섹션을 캡쳐 가능한 블록으로 감싸기
function CopyableSection({
    title,
    children,
    extraRight,
    onRegisterSection,
    sectionId,
    sectionType, // "표" 또는 "그래프"
    draggable,
    onDragStart,
    onDragOver,
    onDrop,
    hideToolbar = false, // 🔹 추가: 보고서 모드에서 툴바 숨김
}) {
    // 바깥 카드(섹션 전체 박스)용 ref
    const containerRef = useRef(null);
    // 캡쳐 대상(그래프/표 내용 영역)용 ref
    const contentRef = useRef(null);

    useEffect(() => {
        if (onRegisterSection && sectionId) {
            onRegisterSection({
                id: sectionId,
                title,
                type: sectionType || "표",
                // ✅ 캡쳐/다운로드에는 "내용 영역" 사용
                ref: contentRef,
            });
        }
    }, [onRegisterSection, sectionId, sectionType, title]);

    return (
        <div
            ref={containerRef}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            style={{
                border: "1px solid #e0e0e0",
                borderRadius: "10px",
                padding: "10px 12px",
                marginBottom: "16px",
                backgroundColor: "#fafafa",
                resize: "horizontal",
                overflow: "auto",
                minWidth: 400,
                maxWidth: "100%",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                }}
            >
                <div style={{ fontWeight: 600, fontSize: "14px" }}>{title}</div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {extraRight}
                    {/* ✅ 섹션 복사는 바깥 박스 말고 "내용 영역"만 캡쳐 */}
                    {!hideToolbar && <CopyAsImageButton targetRef={contentRef} />}
                </div>
            </div>
            {/* ✅ 여기부터가 실제 캡쳐 대상 (그래프/표 자체) */}
            <div ref={contentRef}>{children}</div>
        </div>
    );
}

// 🔹 HTML 해석 입력/프리뷰 공통 컴포넌트
function HtmlInterpretationEditor({
    label = "해석",
    value,
    onChange,
    readOnly,
    compact,
    previewPayload, // 🔹 추가
}) {
    const [mode, setMode] = useState("edit");
    const effectiveMode = readOnly ? "preview" : mode;

    const handleChange = (e) => {
        onChange?.(e.target.value);
    };

    const buildPreviewHtml = () => {
        const raw = value || "";
        if (!raw.trim()) {
            return `<p style="margin:0;color:#9ca3af;font-size:12px;">해석을 입력하면 이 영역에 표시됩니다.</p>`;
        }
        // 태그가 있으면 그대로 렌더, 없으면 줄바꿈만 <br>로 치환
        if (raw.includes("<")) {
            return raw;
        }
        return raw.replace(/\n/g, "<br />");
    };

    const previewHtml = buildPreviewHtml();

    return (
        <div
            style={{
                marginTop: compact ? 8 : 12,
                padding: compact ? "8px 10px" : "10px 12px",
                borderRadius: 8,
                border: "1px solid #e0e7ff",
                backgroundColor: "#f8f9ff",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                    gap: 8,
                }}
            >
                <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                    }}
                >
                    {/* 🔹 데이터 미리보기 버튼 (보고서 모드에서는 숨김) */}
                    {previewPayload && !readOnly && (
                        <DataPreviewTooltipButton payload={previewPayload} />
                    )}

                    {/* 🔹 편집 / 미리보기 토글 (보고서 모드에서는 숨김) */}
                    {!readOnly && (
                        <div
                            style={{
                                display: "inline-flex",
                                borderRadius: 999,
                                border: "1px solid #cbd5e1",
                                overflow: "hidden",
                                fontSize: 11,
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setMode("edit")}
                                style={{
                                    padding: "2px 8px",
                                    border: "none",
                                    cursor: "pointer",
                                    backgroundColor:
                                        effectiveMode === "edit" ? "#e0edff" : "transparent",
                                }}
                            >
                                편집
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode("preview")}
                                style={{
                                    padding: "2px 8px",
                                    border: "none",
                                    cursor: "pointer",
                                    backgroundColor:
                                        effectiveMode === "preview" ? "#e0edff" : "transparent",
                                }}
                            >
                                미리보기
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {effectiveMode === "edit" && !readOnly && (
                <textarea
                    value={value || ""}
                    onChange={handleChange}
                    placeholder="HTML 또는 일반 텍스트로 자유롭게 입력하세요."
                    style={{
                        width: "100%",
                        minHeight: 70,
                        fontSize: 12,
                        lineHeight: 1.5,
                        resize: "vertical",
                        borderRadius: 6,
                        border: "1px solid #e5e7eb",
                        padding: "6px 8px",
                        fontFamily:
                            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                />
            )}

            {(effectiveMode === "preview" || readOnly) && (
                <div
                    style={{
                        minHeight: 40,
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: "#111827",
                        backgroundColor: "#fff",
                        borderRadius: 6,
                        border: "1px solid #e5e7eb",
                        padding: "8px 10px",
                        whiteSpace: "normal",
                    }}
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
            )}
        </div>
    );
}


// ✅ Step6 전용 그래프/표 도구 모음 (설정은 로컬에서만 바뀌고, "적용" 시에만 부모에 반영)
function Step6ChartToolbox({ config, onApply }) {
    const [draft, setDraft] = useState(config);

    useEffect(() => {
        setDraft(config);
    }, [config]);

    const updateDraft = (patch) => {
        setDraft((prev) => ({ ...prev, ...patch }));
    };

    const handleRangeNumber = (key, min, max) => (e) => {
        const value = Number(e.target.value);
        if (!Number.isFinite(value)) return;
        const clamped = Math.min(max, Math.max(min, value));
        updateDraft({ [key]: clamped });
    };

    const handleColor = (key) => (e) => {
        updateDraft({ [key]: e.target.value });
    };

    const handleCheckbox = (key) => () => {
        setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleApply = () => {
        onApply(draft);
    };

    const handleReset = () => {
        setDraft(defaultStyleConfig);
        onApply(defaultStyleConfig);
    };

    return (
        <div
            style={{
                position: "fixed",
                top: "110px",
                right: "24px",
                zIndex: 2000,
                width: "250px",
                maxWidth: "80vw",
                padding: "10px 12px",
                borderRadius: "14px",
                border: "1px solid #d0d7e2",
                backgroundColor: "rgba(247, 249, 252, 0.96)",
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                fontSize: "12px",
                backdropFilter: "blur(6px)",
            }}
        >
            <div
                style={{
                    fontWeight: 600,
                    fontSize: "13px",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "6px",
                }}
            >
                <span>📊 그래프 · 표 도구</span>
                <button
                    type="button"
                    onClick={handleReset}
                    style={{
                        fontSize: "10px",
                        border: "none",
                        background: "none",
                        color: "#356ac3",
                        cursor: "pointer",
                        textDecoration: "underline",
                    }}
                >
                    기본값
                </button>
            </div>

            {/* 막대 너비 */}
            <div
                style={{
                    marginBottom: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <span>막대 너비</span>
                    <span
                        style={{
                            padding: "2px 6px",
                            borderRadius: "999px",
                            border: "1px solid #ccc",
                            backgroundColor: "#fff",
                        }}
                    >
                        {draft.barSize}px
                    </span>
                </div>
                <input
                    type="range"
                    min={8}
                    max={60}
                    value={draft.barSize}
                    onChange={handleRangeNumber("barSize", 8, 60)}
                />
            </div>

            {/* 표 너비 */}
            <div
                style={{
                    marginBottom: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <span>표 너비</span>
                    <span
                        style={{
                            padding: "2px 6px",
                            borderRadius: "999px",
                            border: "1px solid #ccc",
                            backgroundColor: "#fff",
                        }}
                    >
                        {draft.tableWidthScale}%
                    </span>
                </div>
                <input
                    type="range"
                    min={60}
                    max={160}
                    value={draft.tableWidthScale}
                    onChange={handleRangeNumber("tableWidthScale", 60, 160)}
                />
            </div>

            {/* 그래프 전체 너비 */}
            <div
                style={{
                    marginBottom: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <span>그래프 너비</span>
                    <span
                        style={{
                            padding: "2px 6px",
                            borderRadius: "999px",
                            border: "1px solid#ccc",
                            backgroundColor: "#fff",
                        }}
                    >
                        {draft.chartWidthScale}%
                    </span>
                </div>
                <input
                    type="range"
                    min={60}
                    max={160}
                    value={draft.chartWidthScale}
                    onChange={handleRangeNumber("chartWidthScale", 60, 160)}
                />
            </div>

            {/* 그래프 높이 */}
            <div
                style={{
                    marginBottom: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <span>그래프 높이</span>
                    <span
                        style={{
                            padding: "2px 6px",
                            borderRadius: "999px",
                            border: "1px solid#ccc",
                            backgroundColor: "#fff",
                        }}
                    >
                        {draft.chartHeight}px
                    </span>
                </div>
                <input
                    type="range"
                    min={200}
                    max={360}
                    value={draft.chartHeight}
                    onChange={handleRangeNumber("chartHeight", 200, 360)}
                />
            </div>

            {/* 값 라벨 폰트 크기 */}
            <div
                style={{
                    marginBottom: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <span>값 라벨 크기</span>
                    <span
                        style={{
                            padding: "2px 6px",
                            borderRadius: "999px",
                            border: "1px solid#ccc",
                            backgroundColor: "#fff",
                        }}
                    >
                        {draft.labelFontSize}px
                    </span>
                </div>
                <input
                    type="range"
                    min={10}
                    max={16}
                    value={draft.labelFontSize}
                    onChange={handleRangeNumber("labelFontSize", 10, 16)}
                />
            </div>

            {/* 표 스타일 */}
            <div
                style={{
                    marginTop: "8px",
                    paddingTop: "8px",
                    borderTop: "1px dashed #cbd5e1",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                }}
            >
                <div style={{ fontWeight: 600, fontSize: "12px" }}>표 스타일</div>

                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                    }}
                >
                    <input
                        type="checkbox"
                        checked={draft.tableHeaderBold}
                        onChange={handleCheckbox("tableHeaderBold")}
                    />
                    <span>헤더 볼드 처리</span>
                </label>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                    }}
                >
                    <span>숫자 열 정렬</span>
                    <div
                        style={{
                            display: "flex",
                            gap: "4px",
                            marginTop: "2px",
                        }}
                    >
                        {["left", "center", "right"].map((align) => (
                            <button
                                key={align}
                                type="button"
                                onClick={() => updateDraft({ tableNumericAlign: align })}
                                style={{
                                    flex: 1,
                                    padding: "2px 4px",
                                    fontSize: "11px",
                                    borderRadius: "999px",
                                    border:
                                        draft.tableNumericAlign === align
                                            ? "1px solid #356ac3"
                                            : "1px solid #ccc",
                                    backgroundColor:
                                        draft.tableNumericAlign === align ? "#e3f2fd" : "#fff",
                                    cursor: "pointer",
                                }}
                            >
                                {align === "left" ? "좌" : align === "center" ? "가운데" : "우"}
                            </button>
                        ))}
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "6px",
                    }}
                >
                    <span>헤더 배경색</span>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                        }}
                    >
                        <input
                            type="color"
                            value={draft.tableHeaderBg}
                            onChange={handleColor("tableHeaderBg")}
                            style={{
                                width: 24,
                                height: 18,
                                padding: 0,
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                            }}
                        />
                        <span
                            style={{
                                fontFamily: "monospace",
                                fontSize: "11px",
                            }}
                        >
                            {draft.tableHeaderBg}
                        </span>
                    </div>
                </div>

                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                    }}
                >
                    <input
                        type="checkbox"
                        checked={draft.tableUseZebra}
                        onChange={handleCheckbox("tableUseZebra")}
                    />
                    <span>지브라 행 + 세로 줄</span>
                </label>

                {draft.tableUseZebra && (
                    <>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "6px",
                            }}
                        >
                            <span>지브라 행 색</span>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                }}
                            >
                                <input
                                    type="color"
                                    value={draft.zebraRowColor}
                                    onChange={handleColor("zebraRowColor")}
                                    style={{
                                        width: 24,
                                        height: 18,
                                        padding: 0,
                                        border: "none",
                                        background: "transparent",
                                        cursor: "pointer",
                                    }}
                                />
                                <span
                                    style={{
                                        fontFamily: "monospace",
                                        fontSize: "11px",
                                    }}
                                >
                                    {draft.zebraRowColor}
                                </span>
                            </div>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "6px",
                            }}
                        >
                            <span>세로 줄 색</span>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                }}
                            >
                                <input
                                    type="color"
                                    value={draft.zebraBorderColor}
                                    onChange={handleColor("zebraBorderColor")}
                                    style={{
                                        width: 24,
                                        height: 18,
                                        padding: 0,
                                        border: "none",
                                        background: "transparent",
                                        cursor: "pointer",
                                    }}
                                />
                                <span
                                    style={{
                                        fontFamily: "monospace",
                                        fontSize: "11px",
                                    }}
                                >
                                    {draft.zebraBorderColor}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* 그래프 옵션 */}
            <div
                style={{
                    marginTop: "8px",
                    paddingTop: "8px",
                    borderTop: "1px dashed #cbd5e1",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                }}
            >
                <div style={{ fontWeight: 600, fontSize: "12px" }}>그래프 옵션</div>

                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                    }}
                >
                    <input
                        type="checkbox"
                        checked={draft.showCartesianGrid}
                        onChange={handleCheckbox("showCartesianGrid")}
                    />
                    <span>배경 격자 보이기</span>
                </label>

                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                    }}
                >
                    <input
                        type="checkbox"
                        checked={draft.showLegend}
                        onChange={handleCheckbox("showLegend")}
                    />
                    <span>범례(legend) 보이기</span>
                </label>
            </div>

            {/* 적용 버튼 */}
            <div
                style={{
                    marginTop: "10px",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "6px",
                }}
            >
                <button
                    type="button"
                    onClick={handleApply}
                    style={{
                        padding: "4px 10px",
                        borderRadius: "999px",
                        border: "1px solid #356ac3",
                        backgroundColor: "#356ac3",
                        color: "#fff",
                        fontSize: "11px",
                        cursor: "pointer",
                    }}
                >
                    적용
                </button>
            </div>
        </div>
    );
}

export {
    CopyAsImageButton,
    CopyableSection,
    HtmlInterpretationEditor,
    Step6ChartToolbox,
    DataPreviewTooltipButton, // 선택사항
};
