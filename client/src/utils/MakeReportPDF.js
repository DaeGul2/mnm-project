// src/utils/MakeReportPDF.js
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Step6 전체 영역을 PDF로 저장
 * - A4 기준 상하좌우 marginMm 만큼 여백 줌
 * - 한 페이지에 안 들어가는 높이는 자동으로 다음 페이지에 이어 붙임
 *
 * @param {HTMLElement} rootElement - 캡처할 루트 DOM
 * @param {{ fileName?: string, marginMm?: number }} options
 */
export async function makeReportPDF(rootElement, options = {}) {
  if (!rootElement) {
    throw new Error("rootElement가 없습니다.");
  }

  const { fileName = "step6-report.pdf", marginMm = 8 } = options;

  const canvas = await html2canvas(rootElement, {
    scale: 2,
    useCORS: true,
    scrollX: 0,
    scrollY: -window.scrollY,
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // 상하좌우 여백(mm)
  const margin = marginMm;
  const pdfWidth = pageWidth - margin * 2;
  const pdfHeight = pageHeight - margin * 2;

  // 비율 유지해서 그림 크기 결정
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin; // 첫 페이지에서의 Y 시작 위치

  // 첫 페이지
  pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
  heightLeft -= pdfHeight;

  // 남은 내용이 있으면 새 페이지에 이어서 추가
  while (heightLeft > 0) {
    pdf.addPage();
    // 이미지를 위로 올려서(마이너스) 아래쪽 부분만 보이게 함
    position = margin - (imgHeight - heightLeft);
    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
  }

  pdf.save(fileName);
}
