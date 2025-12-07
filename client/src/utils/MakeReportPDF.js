// src/utils/MakeReportPDF.js
import jsPDF from "jspdf";

/**
 * Step6 화면 캡쳐(canvas) 배열을 받아 한 개의 PDF로 저장
 * - canvas 1개 = PDF 1페이지
 * - 페이지 안에서 자동으로 크기 맞춰 축소
 *
 * @param {HTMLCanvasElement | HTMLCanvasElement[]} canvasOrList
 * @param {{ fileName?: string, marginMm?: number }} options
 */
export async function makeReportPDF(canvasOrList, options = {}) {
  const canvases = Array.isArray(canvasOrList) ? canvasOrList : [canvasOrList];

  if (!canvases.length) {
    throw new Error("PDF로 만들 캔버스가 없습니다.");
  }

  const { fileName = "Step6_Report.pdf", marginMm = 8 } = options;

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = marginMm;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  canvases.forEach((canvas, index) => {
    if (!canvas) return;

    if (index > 0) {
      pdf.addPage();
    }

    const imgData = canvas.toDataURL("image/png");
    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;

    if (!imgWidthPx || !imgHeightPx) return;

    const imgRatio = imgWidthPx / imgHeightPx;

    // 우선 너비 기준으로 맞추고, 높이가 넘치면 다시 조정
    let drawWidth = usableWidth;
    let drawHeight = drawWidth / imgRatio;
    if (drawHeight > usableHeight) {
      drawHeight = usableHeight;
      drawWidth = drawHeight * imgRatio;
    }

    // 가운데 정렬
    const x = margin + (usableWidth - drawWidth) / 2;
    const y = margin + (usableHeight - drawHeight) / 2;

    pdf.addImage(imgData, "PNG", x, y, drawWidth, drawHeight);
  });

  pdf.save(fileName);
}
