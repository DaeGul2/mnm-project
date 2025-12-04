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
 *   maxStepReached?: number
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
      name: payload.name,              // ✅ 전형 이름도 옵션으로 보냄
    },
    {
      headers: {
        Authorization: `Bearer ${projectToken}`,
      },
    }
  );
  return res.data.round;
}