import axios from "axios";

const API = axios.create({
  baseURL: "",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("payguard_auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;

