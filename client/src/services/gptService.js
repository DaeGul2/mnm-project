// src/services/gptService.js
import apiClient from "./apiClient";

/**
 * Step6 자동 해석 HTML 생성
 * POST /api/step6/interpretations/auto
 *
 * @param {Object} params
 * @param {string} params.projectName   // 프로젝트 이름 (프롬프트용, 선택이지만 넣는게 좋음)
 * @param {string} params.stageName     // 전형 이름 (예: "서류전형")
 * @param {string} params.section       // 해석 섹션 키 (예: "crossGroupSummary", "groupStats" 등)
 * @param {string} [params.groupName]   // 특정 그룹 이름 (필요할 때만)
 * @param {Object} params.payload       // 서버에서 기대하는 JSON 통계 데이터
 * @param {string} projectToken         // /projects/:id/unlock에서 받은 토큰
 *
 * @returns {Promise<{ html: string }>}
 */
export async function generateStep6Interpretation(params, projectToken) {
  const res = await apiClient.post(
    "/step6/interpretations/auto",
    {
      projectName: params.projectName,
      stageName: params.stageName,
      section: params.section,
      groupName: params.groupName,
      payload: params.payload,
    },
    {
      headers: {
        Authorization: `Bearer ${projectToken}`,
      },
    }
  );

  // 응답: { html }
  return res.data;
}

export default {
  generateStep6Interpretation,
};
