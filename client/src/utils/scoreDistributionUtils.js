// src/utils/scoreDistributionUtils.js
// Step6에서 사용하는 groupData를 기반으로
// 각 지원분야별 총점 분포(Scatter)용 포인트를 만들어주는 유틸

export function buildGroupScoreScatterData(groupData) {
  const result = {};

  if (!groupData || typeof groupData !== "object") {
    return result;
  }

  Object.entries(groupData).forEach(([groupName, group]) => {
    const candidates = group?.candidates || [];
    if (!candidates.length) return;

    const points = candidates
      .filter(
        (c) =>
          c &&
          c.totalScore !== null &&
          c.totalScore !== undefined &&
          !Number.isNaN(Number(c.totalScore))
      )
      .map((c, index) => {
        const totalScore = Number(c.totalScore);
        return {
          // scatter key 용 id (수험번호가 없으면 fallback)
          id:
            c.examNo !== undefined && c.examNo !== null && String(c.examNo).trim()
              ? String(c.examNo)
              : `${groupName}-${index}`,
          examNo:
            c.examNo !== undefined && c.examNo !== null
              ? String(c.examNo)
              : null,
          totalScore,
          phaseRole: c.phaseRole || null, // "합격" / "불합격" / null
          finalRole: c.finalRole || null, // 최종 합/불
        };
      });

    if (points.length) {
      result[groupName] = points;
    }
  });

  return result;
}
