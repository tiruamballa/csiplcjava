import axios from "axios";

export const TOKEN_KEY = "csi_admin_token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 15000,
});

// Attach the admin JWT (if any) to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && !config.url.startsWith("/admin/login")) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the server says our token is expired/invalid, drop it and tell the app.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLogin = err.config?.url?.startsWith("/admin/login");
    if (err.response?.status === 401 && !isLogin && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(
        new CustomEvent("auth:expired", { detail: err.response.data?.detail })
      );
    }
    return Promise.reject(err);
  }
);

/** Turn any axios error into a short, friendly message. */
export function getErrorMessage(err) {
  if (!err.response) {
    return err.code === "ECONNABORTED"
      ? "The server took too long to respond. Please try again."
      : "Can't reach the server. Check your internet connection and try again.";
  }
  const { status, data } = err.response;
  if (status >= 500) return "Something went wrong on our side. Please try again in a moment.";
  if (typeof data?.detail === "string") return data.detail;
  return "Something went wrong. Please try again.";
}

/** Field-level validation messages from the API (HTTP 422), e.g. { title: "..." } */
export function getFieldErrors(err) {
  return err.response?.status === 422 ? err.response.data?.errors || {} : {};
}

// Public
export const fetchToday = () => api.get("/assignments/today").then((r) => r.data);
export const fetchAll = () => api.get("/assignments").then((r) => r.data);
export const fetchDay = (day) => api.get(`/assignments/day/${day}`).then((r) => r.data);

// Admin
export const loginAdmin = (password) =>
  api.post("/admin/login", { email: "admin@csi.org", password }).then((r) => r.data);
export const fetchMe = () => api.get("/admin/me").then((r) => r.data);
export const fetchAdminAssignments = () => api.get("/admin/assignments").then((r) => r.data);
export const createAssignment = (data) => api.post("/assignments", data).then((r) => r.data);
export const updateAssignment = (id, data) => api.put(`/assignments/${id}`, data).then((r) => r.data);
export const deleteAssignment = (id) => api.delete(`/assignments/${id}`);

// Admin - students
export const fetchStudents = (lab) =>
  api.get("/admin/students", { params: lab ? { lab } : {} }).then((r) => r.data);
export const addStudent = (data) => api.post("/admin/students", data).then((r) => r.data);
export const addStudentsBulk = (students) => api.post("/admin/students/bulk", { students }).then((r) => r.data);
export const updateStudent = (id, data) => api.put(`/admin/students/${id}`, data).then((r) => r.data);
export const changeStudentLab = (id, lab) => api.patch(`/admin/students/${id}/lab`, { lab }).then((r) => r.data);
export const deleteStudent = (id) => api.delete(`/admin/students/${id}`);

// Admin - attendance (one sheet = one date + one lab)
export const fetchAttendanceDay = (date, lab) =>
  api.get(`/admin/attendance/${date}`, { params: { lab } }).then((r) => r.data);
export const saveAttendance = (date, lab, records) =>
  api.put(`/admin/attendance/${date}`, { lab, records }).then((r) => r.data);
export const deleteAttendanceDay = (date, lab) =>
  api.delete(`/admin/attendance/${date}`, { params: { lab } });
export const fetchSessions = () => api.get("/admin/attendance/sessions").then((r) => r.data);
export const fetchReport = (lab) =>
  api.get("/admin/attendance/report", { params: lab ? { lab } : {} }).then((r) => r.data);
export const fetchOverview = () => api.get("/admin/attendance/stats/overview").then((r) => r.data);

export default api;
