// server/services/step6InterpretationService.js
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Step6 해석 자동 생성 서비스
 * @param {Object} params
 * @param {string} params.projectName - 프로젝트 이름 (리포트 컨텍스트용)
 * @param {string} params.stageName - 전형 단계명 (예: '서류전형')
 * @param {string} params.section - 섹션 키 (예: 'overview-crossGroupSummary', 'group-summaryStats' 등)
 * @param {string|null} params.groupName - 지원분야명 (그룹 단위 섹션일 때만)
 * @param {Object} params.payload - { role, scope, data, ... } 구조
 * @returns {Promise<string>} html 문자열
 */
async function generateStep6InterpretationHtml({
  projectName,
  stageName,
  section,
  groupName,
  payload,
}) {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload가 비어 있거나 잘못된 형식입니다.");
  }

  const { role, scope, data, ...rest } = payload;

  const systemPrompt = `
당신은 채용 데이터 분석 보고서 작성 보조 도구입니다.
입력으로 "역할 설명"과 "통계 데이터(JSON)"를 받아,
채용 담당자가 바로 보고서에 붙여넣어 사용할 수 있는 해석 문단을 작성합니다.

반드시 아래 요구사항을 지키세요:

1. 출력 형식
- 출력은 하나의 HTML 문자열이어야 합니다.
- <p>, <ul>, <li>, <strong>, <em>, <span>, <br> 정도만 사용하십시오.
- 스타일 속성은 '꼭 필요한 곳에만 최소한으로 사용합니다.'
- 한국어로 작성합니다.

2. 내용 스타일
- 과도한 미사여구 없이, 분석 보고서 톤으로 작성합니다.
- "데이터를 보면 ~", "표에서 확인할 수 있듯이 ~"처럼 실제 수치를 근거로 설명합니다.
- 중요한 수치(합격률 차이, 평균 점수 차이 등)는 <strong>으로 강조할 수 있습니다.
- 해석은 '채용 운영자 입장에서 의사결정에 도움이 되는 관점'을 포함합니다.
- 데이터에 없는 내용을 과도하게 추론하지 말고, "해석상 이렇게 볼 수 있다" 수준에서 표현합니다.
- 데이터를 '해석'한 내용은 <strong> 또는 <em>로 강조할 수 있습니다.
- 데이터가 안 보내진 게 있다면, 불합격자가 없다든가 혹은 합격자가 없다든가 하는 것입니다.
- 어조 : ~했습니다 대신 '~했다. ~임. ~이다.' 등 평어체 사용.

3. 숫자 사용
- 너무 많은 숫자를 나열하지 말고, 의미 있는 격차/패턴 위주로 요약합니다.
- 소수점은 필요 시 한 자리 또는 두 자리까지만 사용합니다.

4. 섹션 타입별 가이드 (section 값에 따라 참고)
- overview-crossGroupSummary:
  · 여러 지원분야의 인원수, 합격률, 평균 점수, 커트라인 등을 비교하여
    어떤 지원분야가 상대적으로 경쟁이 치열했는지, 커트라인이 높은지 등을 요약합니다.
- group-summaryStats:
  · 해당 지원분야 내부의 점수 분포(최고/최저/커트라인/표준편차 등)를 설명하고,
    점수 분포가 넓은지/좁은지, 커트라인 위치가 어느 정도 상위에 해당하는지를 서술합니다.
- group-phaseTotalAvg:
  · 전형 합격자 vs 불합격자의 평균 점수를 비교하여,
    점수 차이가 어느 정도인지, 합격/불합격이 점수에 의해 얼마나 잘 구분되었는지 등을 설명합니다.
- group-fieldStats:
  · 각 평가항목별로 합격자/불합격자 평균과 상관계수를 기반으로,
    어떤 항목이 합격을 가르는 핵심 요인인지, 상대적으로 영향이 약한 항목은 무엇인지 정리합니다.
- group-finalCompare:
  · 최종 합격(입사 대상) vs 최종 불합격(전형 합격) 집단의 총점 평균 차이를 설명하고,
    서류 점수가 최종 합격까지 이어졌는지, 이후 전형(면접 등)에서 변별이 추가로 일어났는지 등을 논의합니다.


`.trim();

  const userContent = {
    projectName,
    stageName,
    section,
    groupName,
    scope,
    role,
    data,
    extra: rest,
  };

  const model = process.env.OPENAI_STEP6_MODEL || "gpt-4.1-mini";

  const userText = [
    "다음 정보를 바탕으로 이 섹션에 들어갈 해석 문단을 HTML로 작성해 주세요.",
    "",
    `- 프로젝트명: ${projectName || "(미지정)"}`,
    `- 전형 단계명: ${stageName || "(미지정)"}`,
    `- 섹션 키: ${section}`,
    `- 지원분야명: ${groupName || "(해당 없음)"}`,
    "",
    "[역할 설명]",
    role || "(설명 없음)",
    "",
    "[데이터(JSON)]",
    "아래 JSON은 이 섹션에서 참고해야 할 통계 요약입니다.",
    "",
    JSON.stringify(userContent, null, 2),
  ].join("\n");

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userText,
      },
    ],
    temperature: 0.5,
  });

  const html = completion.choices?.[0]?.message?.content || "";
  if (!html || typeof html !== "string") {
    throw new Error("모델 응답에서 HTML 문자열을 찾을 수 없습니다.");
  }

  return html.trim();
}

module.exports = {
  generateStep6InterpretationHtml,
};
