// src/services/evalRoundService.js
import apiClient from "./apiClient";

/**
 * 특정 프로젝트에 속한 전형 목록 조회
 * GET /api/projects/:projectId/rounds
 */
export async function listRoundsByProject(projectId, projectToken) {
  const res = await apiClient.get(`/projects/${projectId}/rounds`, {
    headers: {
      Authorization: `Bearer ${projectToken}`,
    },
  });
  return res.data.rounds;
}

/**
 * 전형 상세 + 행 데이터 조회
 * GET /api/rounds/:roundId
 * 응답: { round, rows }
 */
export async function getRoundDetail(roundId, projectToken) {
  const res = await apiClient.get(`/rounds/${roundId}`, {
    headers: {
      Authorization: `Bearer ${projectToken}`,
    },
  });
  return res.data; // { round, rows }
}

/**
 * 전형 삭제 (해당 전형 + 관련 행 전체 삭제)
 * DELETE /api/rounds/:roundId
 */
export async function deleteRound(roundId, projectToken) {
  const res = await apiClient.delete(`/rounds/${roundId}`, {
    headers: {
      Authorization: `Bearer ${projectToken}`,
    },
  });
  return res.data;
}

/**
 * 전형의 엑셀 데이터를 통째로 갈아끼우기
 * PUT /api/rounds/:roundId/replace-data
 *
 * payload: {
 *   headers: string[],
 *   rows: any[],
 *   mapping?: object,
 *   supportGroups?: object,
 *   resultMapping?: object,
 *   maxStepReached?: number
 * }
 */
export async function replaceRoundData(roundId, payload, projectToken) {
  const res = await apiClient.put(
    `/rounds/${roundId}/replace-data`,
    {
      headers: payload.headers,
      rows: payload.rows,
      mapping: payload.mapping,
      supportGroups: payload.supportGroups,
      resultMapping: payload.resultMapping,
      maxStepReached: payload.maxStepReached,
    },
    {
      headers: {
        Authorization: `Bearer ${projectToken}`,
      },
    }
  );
  return res.data;
}

/**
 * 새 전형 생성 (Step2 끝날 때 최초 1회)
 * POST /api/projects/:projectId/rounds
 */
export async function createRound(projectId, payload, projectToken) {
  const res = await apiClient.post(
    `/projects/${projectId}/rounds`,
    {
      name: payload.name,
      headers: payload.headers,
      rows: payload.rows,
      mapping: payload.mapping,
      supportGroups: payload.supportGroups,
      resultMapping: payload.resultMapping,
    },
    {
      headers: {
        Authorization: `Bearer ${projectToken}`,
      },
    }
  );
  return res.data.round;
}

/**
 * 전형 설정(JSON) 업데이트
 * PUT /api/rounds/:roundId/config
 *
 * payload: {
 *   mapping?: object,
 *   supportGroups?: object,
 *   resultMapping?: object,
 *   maxStepReached?: number,
 *   name?: string
 * }
 */
export async function updateRoundConfig(roundId, payload, projectToken) {
  const res = await apiClient.put(
    `/rounds/${roundId}/config`,
    {
      mapping: payload.mapping,
      supportGroups: payload.supportGroups,
      resultMapping: payload.resultMapping,
      maxStepReached: payload.maxStepReached,
      name: payload.name, // ✅ 전형 이름도 옵션으로 보냄
    },
    {
      headers: {
        Authorization: `Bearer ${projectToken}`,
      },
    }
  );
  return res.data.round;
}

/* ------------------------------------------------------------------
 * Step6 계산 결과 캐시 (EvalRoundCalc)
 *   - GET /rounds/:roundId/calc
 *   - PUT /rounds/:roundId/calc
 *   - DELETE /rounds/:roundId/calc
 * ------------------------------------------------------------------*/

/**
 * Step6 계산 결과 조회
 * GET /api/rounds/:roundId/calc
 *
 * 반환 형식:
 * {
 *   calc: {
 *     id,
 *     eval_round_id,
 *     name,
 *     config,        // { styleConfig, includedFieldsByGroup, groupOrder, ... }
 *     stats,         // { crossGroupSummary, groups: { ... } }
 *     schema_version,
 *     calculated_at,
 *     created_at,
 *     updated_at
 *   }
 * }
 *
 * 404일 경우: 저장된 계산 결과 없음 → 클라에서 새로 계산해야 함.
 */
export async function getRoundCalc(roundId, projectToken) {
  const res = await apiClient.get(`/rounds/${roundId}/calc`, {
    headers: {
      Authorization: `Bearer ${projectToken}`,
    },
  });
  return res.data; // { calc }
}

/**
 * Step6 계산 결과 저장/업데이트
 * PUT /api/rounds/:roundId/calc
 *
 * payload: {
 *   name?: string,   // 레코드 이름 (예: "기본 분석", "2025-12-06 버전")
 *   config: object,  // Step6 UI 설정 (styleConfig, includedFieldsByGroup, groupOrder 등)
 *   stats: object    // Step6 계산 결과 (crossGroupSummary, groups 등)
 * }
 */
export async function saveRoundCalc(roundId, payload, projectToken) {
  const res = await apiClient.put(
    `/rounds/${roundId}/calc`,
    {
      name: payload.name,
      config: payload.config,
      stats: payload.stats,
    },
    {
      headers: {
        Authorization: `Bearer ${projectToken}`,
      },
    }
  );
  return res.data; // { message, calc }
}

/**
 * Step6 계산 결과 삭제 (캐시 초기화 용도)
 * DELETE /api/rounds/:roundId/calc
 */
export async function deleteRoundCalc(roundId, projectToken) {
  const res = await apiClient.delete(`/rounds/${roundId}/calc`, {
    headers: {
      Authorization: `Bearer ${projectToken}`,
    },
  });
  return res.data; // { message }
}

/* ------------------------------------------------------------------
 * GPT 보고서 (EvalRoundReport)
 *   - GET  /rounds/:roundId/reports
 *   - POST /rounds/:roundId/reports
 *   - PUT  /rounds/:roundId/reports/:reportId
 *   - DELETE /rounds/:roundId/reports/:reportId
 * ------------------------------------------------------------------*/

/**
 * 특정 전형의 GPT 리포트 목록 조회
 * GET /api/rounds/:roundId/reports
 *
 * 반환 형식:
 * {
 *   reports: [
 *     {
 *       id,
 *       eval_round_id,
 *       name,
 *       report,         // GPT 결과 JSON
 *       schema_version,
 *       generated_at,
 *       created_at,
 *       updated_at
 *     },
 *     ...
 *   ]
 * }
 */
export async function listRoundReports(roundId, projectToken) {
  const res = await apiClient.get(`/rounds/${roundId}/reports`, {
    headers: {
      Authorization: `Bearer ${projectToken}`,
    },
  });
  return res.data; // { reports }
}

/**
 * GPT 리포트 생성
 * POST /api/rounds/:roundId/reports
 *
 * payload: {
 *   name?: string,          // 리포트 이름 (예: "임원용 요약", "전체 상세")
 *   report: object,         // GPT가 만든 보고서 JSON
 *   schema_version?: string // 기본: "v1"
 * }
 */
export async function createRoundReport(roundId, payload, projectToken) {
  const res = await apiClient.post(
    `/rounds/${roundId}/reports`,
    {
      name: payload.name,
      report: payload.report,
      schema_version: payload.schema_version,
    },
    {
      headers: {
        Authorization: `Bearer ${projectToken}`,
      },
    }
  );
  return res.data; // { message, report }
}

/**
 * GPT 리포트 수정
 * PUT /api/rounds/:roundId/reports/:reportId
 *
 * payload: {
 *   name?: string,
 *   report?: object,
 *   schema_version?: string
 * }
 */
export async function updateRoundReport(
  roundId,
  reportId,
  payload,
  projectToken
) {
  const res = await apiClient.put(
    `/rounds/${roundId}/reports/${reportId}`,
    {
      name: payload.name,
      report: payload.report,
      schema_version: payload.schema_version,
    },
    {
      headers: {
        Authorization: `Bearer ${projectToken}`,
      },
    }
  );
  return res.data; // { message, report }
}

/**
 * GPT 리포트 삭제
 * DELETE /api/rounds/:roundId/reports/:reportId
 */
export async function deleteRoundReport(roundId, reportId, projectToken) {
  const res = await apiClient.delete(
    `/rounds/${roundId}/reports/${reportId}`,
    {
      headers: {
        Authorization: `Bearer ${projectToken}`,
      },
    }
  );
  return res.data; // { message }
}
