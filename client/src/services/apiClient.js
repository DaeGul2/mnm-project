// src/services/apiClient.js
import axios from "axios";

const baseURL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:1996/api";

export const apiClient = axios.create({
  baseURL,
  timeout: 30000,
});

// 필요하면 여기서 공통 인터셉터 추가 가능
// apiClient.interceptors.response.use( ... );

export default apiClient;
