// src/components/common/LoadingSpinner.js
import React from "react";

function LoadingSpinner({ message }) {
  return (
    <>
      <style>
        {`
          @keyframes step6SpinnerRotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          backgroundColor: "rgba(15, 23, 42, 0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            minWidth: "220px",
            padding: "16px 20px",
            borderRadius: "18px",
            backgroundColor: "#ffffff",
            boxShadow: "0 18px 45px rgba(15,23,42,0.28)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: "3px solid #e2e8f0",
              borderTopColor: "#2563eb",
              animation: "step6SpinnerRotate 0.8s linear infinite",
            }}
          />
          <div
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#0f172a",
            }}
          >
            {message || "처리 중입니다...ㅋ 기달"}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#64748b",
            }}
          >
            보고서 이미지를 모으는 중이에요.
          </div>
        </div>
      </div>
    </>
  );
}

export default LoadingSpinner;
