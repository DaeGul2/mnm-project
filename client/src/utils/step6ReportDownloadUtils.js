// src/utils/step6ReportDownloadUtils.js
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { saveAs } from "file-saver";

function sanitizeFileName(name) {
  return String(name || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    || "untitled";
}

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}

async function captureSectionToZip(zipFolder, section, indexInFolder) {
  if (!section || !section.ref || !section.ref.current) return false;

  const node = section.ref.current;
  const canvas = await html2canvas(node, { scale: 2 });

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );

  if (!blob) return false;

  const safeTitle = sanitizeFileName(section.title || `section_${indexInFolder + 1}`);
  const safeType = sanitizeFileName(section.type || "섹션");
  const idx = String(indexInFolder + 1).padStart(2, "0");

  const fileName = `${idx}_${safeType}_${safeTitle}.png`;
  zipFolder.file(fileName, blob);

  return true;
}

/**
 * Step6 전체 레포트 ZIP 다운로드
 * - overviewSections: 개요/전역 섹션 배열
 * - groupSections: [{ groupName, sections: SectionInfo[] }]
 * - projectName, stageName: ZIP 파일 이름에 사용
 */
export async function downloadStep6FullReportZip({
  overviewSections = [],
  groupSections = [],
  projectName,
  stageName,
}) {
  const zip = new JSZip();
  let capturedCount = 0;

  const safeProject = sanitizeFileName(projectName || "프로젝트");
  const safeStage = sanitizeFileName(stageName || "전형");
  const timestamp = formatTimestamp(new Date());

  const zipFileName = `${safeProject}_${safeStage}_일괄다운로드_${timestamp}.zip`;

  // 0. 개요 섹션 폴더
  if (overviewSections && overviewSections.length > 0) {
    const overviewFolder = zip.folder("00_개요");
    const sortedOverview = [...overviewSections].sort((a, b) => {
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });

    for (let i = 0; i < sortedOverview.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await captureSectionToZip(overviewFolder, sortedOverview[i], i);
      if (ok) capturedCount += 1;
    }
  }

  // 1. 지원분야별 섹션 폴더
  if (groupSections && groupSections.length > 0) {
    for (let gIdx = 0; gIdx < groupSections.length; gIdx += 1) {
      const group = groupSections[gIdx];
      if (!group || !group.sections || !group.sections.length) continue;

      const safeGroup = sanitizeFileName(group.groupName || `지원분야_${gIdx + 1}`);
      const folderIdx = String(gIdx + 1).padStart(2, "0");
      const folderName = `${folderIdx}_${safeGroup}`;
      const groupFolder = zip.folder(folderName);

      const sortedSections = [...group.sections].sort((a, b) => {
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
      });

      for (let i = 0; i < sortedSections.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await captureSectionToZip(groupFolder, sortedSections[i], i);
        if (ok) capturedCount += 1;
      }
    }
  }

  if (!capturedCount) {
    // 아무 것도 캡쳐 안됐으면 걍 실패 처리
    throw new Error("캡쳐할 섹션이 없습니다.");
  }

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, zipFileName);
}
