// src/utils/excelUtils.js
import * as XLSX from "xlsx";

/**
 * 엑셀 파일을 읽어서
 * - headers: 1행 헤더 배열
 * - rows: [{헤더: 값, ...}, ...] 형태로 반환
 */
export async function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];

        // header: 1 옵션으로 2차원 배열 얻기
        const sheetData = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
        });

        if (!sheetData || sheetData.length === 0) {
          return resolve({ headers: [], rows: [] });
        }

        const [headerRow, ...bodyRows] = sheetData;
        const headers = headerRow.map((h) => String(h || "").trim());

        const rows = bodyRows.map((rowArr) => {
          const rowObj = {};
          headers.forEach((header, idx) => {
            rowObj[header] = rowArr[idx] ?? "";
          });
          return rowObj;
        });

        resolve({ headers, rows });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
