// src/services/projectService.js
import apiClient from "./apiClient";

/**
 * 프로젝트 생성
 * @param {{ name: string, description?: string, password: string }} payload
 */
export async function createProject(payload) {
  const res = await apiClient.post("/projects", payload);
  return res.data.project;
}

/**
 * 프로젝트 목록 조회
 */
export async function listProjects() {
  const res = await apiClient.get("/projects");
  return res.data.projects;
}

/**
 * 프로젝트 단건 조회
 * @param {number|string} projectId
 */
export async function getProject(projectId) {
  const res = await apiClient.get(`/projects/${projectId}`);
  return res.data.project;
}

/**
 * 프로젝트 잠금 해제 (비밀번호 확인 → 프로젝트 토큰 발급)
 * @param {number|string} projectId
 * @param {string} password
 * @returns {{ token: string, project: any }}
 */
export async function unlockProject(projectId, password) {
  const res = await apiClient.post(`/projects/${projectId}/unlock`, {
    password,
  });
  return res.data;
}

/**
 * 프로젝트 수정 (이름/설명/비밀번호 변경)
 * @param {number|string} projectId
 * @param {{ name?: string, description?: string, newPassword?: string }} payload
 * @param {string} projectToken
 */
export async function updateProject(projectId, payload, projectToken) {
  const res = await apiClient.put(`/projects/${projectId}`, payload, {
    headers: {
      Authorization: `Bearer ${projectToken}`,
    },
  });
  return res.data.project;
}

/**
 * 프로젝트 삭제
 * @param {number|string} projectId
 * @param {string} projectToken
 */
export async function deleteProject(projectId, projectToken) {
  const res = await apiClient.delete(`/projects/${projectId}`, {
    headers: {
      Authorization: `Bearer ${projectToken}`,
    },
  });
  return res.data;
}

/**
 * 프로젝트 토큰 로컬스토리지 편의 함수들 (선택)
 */
const TOKEN_KEY_PREFIX = "mnm_project_token_";

export function saveProjectToken(projectId, token) {
  try {
    localStorage.setItem(`${TOKEN_KEY_PREFIX}${projectId}`, token);
  } catch {
    // 로컬스토리지 막힌 환경이면 그냥 무시
  }
}

export function getProjectToken(projectId) {
  try {
    return localStorage.getItem(`${TOKEN_KEY_PREFIX}${projectId}`) || null;
  } catch {
    return null;
  }
}

export function removeProjectToken(projectId) {
  try {
    localStorage.removeItem(`${TOKEN_KEY_PREFIX}${projectId}`);
  } catch {
    // 무시
  }
}
