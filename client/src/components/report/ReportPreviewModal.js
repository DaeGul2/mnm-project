// src/components/report/ReportPreviewModal.js
import React from "react";

export default function ReportPreviewModal({
  open,
  onClose,
  pages,
  pageScale,
  pageMargin,
  baseWidth,
  baseHeight,
}) {
  if (!open) return null;

  const scaledWidth = (baseWidth * pageScale) / 100;
  const scaledHeight = (baseHeight * pageScale) / 100;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15,23,42,0.55)",
        zIndex: 3000,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "90vw",
          height: "90vh",
          backgroundColor: "#f3f4f6",
          borderRadius: "12px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
          }}
        >
          <div>
            <span
              style={{
                fontWeight: 600,
                marginRight: "6px",
              }}
            >
              보고서 미리보기
            </span>
            <span style={{ color: "#6b7280" }}>
              실제 인쇄 비율에 가까운 화면입니다. (스크롤로 페이지 이동)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              backgroundColor: "transparent",
              fontSize: "20px",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              alignItems: "center",
            }}
          >
            {pages.map((page, pageIndex) => (
              <div
                key={page.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "#6b7280",
                  }}
                >
                  페이지 {pageIndex + 1}
                </div>
                <div
                  style={{
                    width: `${scaledWidth}px`,
                    height: `${scaledHeight}px`,
                    backgroundColor: "#fff",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    borderRadius: "4px",
                    padding: `${pageMargin}px`,
                    overflow: "hidden",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      minHeight: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    {page.blocks.map((block) => (
                      <div
                        key={block.id}
                        style={{
                          borderRadius: "6px",
                          border: "1px solid #e5e7eb",
                          padding: "6px 8px",
                          marginBottom: "8px",
                          backgroundColor:
                            block.type === "step6-section"
                              ? "#f9fafb"
                              : "#ffffff",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            marginBottom: "4px",
                          }}
                        >
                          {block.type === "step6-section"
                            ? block.title
                            : "텍스트"}
                          {block.meta?.groupName && (
                            <span
                              style={{
                                marginLeft: "4px",
                                fontWeight: 400,
                                color: "#6b7280",
                              }}
                            >
                              · {block.meta.groupName}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {block.content ||
                            (block.type === "step6-section"
                              ? "이 표/그래프에 대한 설명이 아직 작성되지 않았습니다."
                              : "텍스트가 비어 있습니다.")}
                        </div>
                      </div>
                    ))}
                    {page.blocks.length === 0 && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#9ca3af",
                        }}
                      >
                        이 페이지에는 아직 내용이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
