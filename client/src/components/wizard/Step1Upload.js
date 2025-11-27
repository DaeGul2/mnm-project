// src/components/wizard/Step1Upload.js
import React, { useState, useCallback } from "react";
import { parseExcelFile } from "../../utils/excelUtils";

const dropZoneStyle = {
  border: "2px dashed #888",
  borderRadius: "12px",
  padding: "40px",
  textAlign: "center",
  cursor: "pointer",
  backgroundColor: "#fafafa",
};

export default function Step1Upload({ onParsed }) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleFiles = useCallback(
    async (file) => {
      if (!file) return;
      setFileName(file.name);
      const parsed = await parseExcelFile(file);
      onParsed(parsed);
    },
    [onParsed]
  );

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const file = e.dataTransfer.files?.[0];
    await handleFiles(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    await handleFiles(file);
  };

  return (
    <div style={{ width: "100%" }}>
      <h2>1. 엑셀 업로드</h2>
      <p style={{ color: "#555" }}>1행은 헤더(컬럼명)이라고 가정한다.</p>

      <div
        style={{
          ...dropZoneStyle,
          borderColor: dragOver ? "#1976d2" : "#888",
          backgroundColor: dragOver ? "#e3f2fd" : "#fafafa",
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById("excel-input")?.click()}
      >
        <input
          id="excel-input"
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={handleChange}
        />
        <div>
          <div>여기에 엑셀 파일을 드래그 앤 드롭하거나 클릭해서 선택</div>
          {fileName && (
            <div style={{ marginTop: "12px", color: "#333", fontWeight: 500 }}>
              선택된 파일: {fileName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
