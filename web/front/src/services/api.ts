import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const verifyEmailToken = async (token: string) => {
  const res = await API.post("/auth/verify-email", { token });
  return res.data;
};

export const resendVerificationEmail = async (email: string) => {
  const res = await API.post("/auth/resend-verification", { email });
  return res.data;
};

export const completeDoctorProfile = async (data: { userId: string, specialty: string, licenseNumber: string, hospitalOrClinic?: string }) => {
  const res = await API.post("/auth/complete-profile", data);
  return res.data;
};

export default API;

/* =========================
   DOCTOR
========================= */

export const getDoctorProfile = async () => {
  const res = await API.get("/doctor/profile");
  return res.data;
};

export const updateDoctorProfile = async (data: {
  fullName?: string;
  email?: string;
  phone?: string;
  specialty?: string;
  hospitalOrClinic?: string;
}) => {
  const res = await API.put("/doctor/profile", data);
  return res.data;
};

export const changeDoctorPassword = async (data: {
  currentPassword: string;
  newPassword: string;
}) => {
  const res = await API.put("/doctor/change-password", data);
  return res.data;
};

/* =========================
   PATIENT
========================= */

export const getPatientECGs = async () => {
  const res = await API.get("/patient/ecgs");
  return res.data;
};

export const getApprovedDoctors = async () => {
  const res = await API.get("/patient/doctors");
  return res.data;
};

export const assignDoctorToPatient = async (doctorId: string) => {
  const res = await API.put(`/patient/assign-doctor/${doctorId}`);
  return res.data;
};

export const getMyDoctor = async () => {
  const res = await API.get("/patient/my-doctor");
  return res.data;
};


export const createPatientECG = async (data: {
  file: File;
  title?: string;
  doctorId?: string;
  urgency?: string;
  notes?: string;
}) => {
  const formData = new FormData();

  formData.append("file", data.file);
  formData.append("title", data.title || data.file.name);

  if (data.doctorId) formData.append("doctorId", data.doctorId);
  if (data.urgency) formData.append("urgency", data.urgency);
  if (data.notes) formData.append("notes", data.notes);

  const res = await API.post("/patient/ecgs", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
};

export const getPatientProfile = async () => {
  const res = await API.get("/patient/profile");
  return res.data;
};

export const updatePatientProfile = async (data: {
  fullName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: "male" | "female";
}) => {
  const res = await API.put("/patient/profile", data);
  return res.data;
};

export const changePatientPassword = async (data: {
  currentPassword: string;
  newPassword: string;
}) => {
  const res = await API.put("/patient/change-password", data);
  return res.data;
};

export const getPatientECGStats = async () => {
  const res = await API.get("/patient/ecgs/stats");
  return res.data;
};

/* =========================
   ADMIN DASHBOARD
========================= */

export const getAdminStats = async () => {
  const res = await API.get("/admin/dashboard/stats");
  return res.data;
};

export const getAdminCharts = async () => {
  const res = await API.get("/admin/dashboard/charts");
  return res.data;
};

export const getRecentDoctors = async () => {
  const res = await API.get("/admin/dashboard/recent-doctors");
  return res.data;
};

/* =========================
   ADMIN DOCTORS / VERIFICATION
========================= */

export const getPendingDoctors = async () => {
  const res = await API.get("/admin/pending-doctors");
  return res.data;
};

export const approveDoctor = async (id: string) => {
  const res = await API.put(`/admin/approve-doctor/${id}`);
  return res.data;
};

export const rejectDoctor = async (id: string) => {
  const res = await API.put(`/admin/reject-doctor/${id}`);
  return res.data;
};

export const getDoctors = async (tab: "en_attente" | "verifie") => {
  if (tab === "en_attente") {
    const res = await API.get("/admin/pending-doctors");
    return res.data;
  }

  const res = await API.get("/admin/users");
  return res.data.filter(
    (user: any) => user.role === "doctor" && user.isApproved === true
  );
};

/* =========================
   ADMIN USERS
========================= */

export const getAllUsers = async () => {
  const res = await API.get("/admin/users");
  return res.data;
};

export const getUserById = async (id: string) => {
  const res = await API.get(`/admin/users/${id}`);
  return res.data;
};

export const createUserByAdmin = async (data: {
  fullName: string;
  email: string;
  password: string;
  role: "admin" | "doctor" | "patient";
  phone?: string;
  dateOfBirth?: string;
  gender?: "male" | "female";
  specialty?: string;
  licenseNumber?: string;
  hospitalOrClinic?: string;
  isApproved?: boolean;
}) => {
  const res = await API.post("/admin/users", data);
  return res.data;
};

export const updateUserByAdmin = async (
  id: string,
  data: {
    fullName?: string;
    email?: string;
    password?: string;
    role?: "admin" | "doctor" | "patient";
    phone?: string;
    dateOfBirth?: string;
    gender?: "male" | "female";
    specialty?: string;
    licenseNumber?: string;
    hospitalOrClinic?: string;
    isApproved?: boolean;
  }
) => {
  const res = await API.put(`/admin/users/${id}`, data);
  return res.data;
};

export const deleteUser = async (id: string) => {
  const res = await API.delete(`/admin/users/${id}`);
  return res.data;
};

/* =========================
   ADMIN ARTICLES
========================= */

export const getAdminArticles = async () => {
  const res = await API.get("/admin/articles");
  return res.data;
};

export const getAdminArticleById = async (id: string) => {
  const res = await API.get(`/admin/articles/${id}`);
  return res.data;
};

export const createAdminArticle = async (data: {
  title: string;
  content: string;
  category: "Éducation" | "Prévention" | "Pathologie" | "Traitement" | "Actualité";
  coverImage?: string;
  isPublished?: boolean;
}) => {
  const res = await API.post("/admin/articles", data);
  return res.data;
};

export const updateAdminArticle = async (
  id: string,
  data: {
    title?: string;
    content?: string;
    category?: "Éducation" | "Prévention" | "Pathologie" | "Traitement" | "Actualité";
    coverImage?: string;
    isPublished?: boolean;
  }
) => {
  const res = await API.put(`/admin/articles/${id}`, data);
  return res.data;
};

export const deleteAdminArticle = async (id: string) => {
  const res = await API.delete(`/admin/articles/${id}`);
  return res.data;
};

export const getArticleStats = async (id: string) => {
  const res = await API.get(`/admin/articles/${id}/stats`);
  return res.data;
};

export const deleteArticleCommentByAdmin = async (
  articleId: string,
  commentId: string
) => {
  const res = await API.delete(
    `/admin/articles/${articleId}/comments/${commentId}`
  );
  return res.data;
};

export const uploadArticleImage = async (file: File) => {
  const formData = new FormData();
  formData.append("image", file);

  const res = await API.post("/upload/article-image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

/* =========================
   ADMIN NOTIFICATIONS
========================= */

export const getAdminNotifications = async () => {
  const res = await API.get("/admin/notifications");
  return res.data;
};

export const getUnreadNotificationsCount = async () => {
  const res = await API.get("/admin/notifications/unread-count");
  return res.data;
};

export const markNotificationAsRead = async (id: string) => {
  const res = await API.patch(`/admin/notifications/${id}/read`);
  return res.data;
};

export const markAllNotificationsAsRead = async () => {
  const res = await API.patch("/admin/notifications/read-all");
  return res.data;
};

export const getDoctorDashboardStats = async () => {
  const res = await API.get("/doctor/dashboard/stats");
  return res.data;
};

export const getDoctorWeeklyAnalysis = async () => {
  const res = await API.get("/doctor/dashboard/weekly-analysis");
  return res.data;
};

export const getDoctorRecentPatients = async () => {
  const res = await API.get("/doctor/dashboard/recent-patients");
  return res.data;
};

export const getDoctorRecentAnalyses = async () => {
  const res = await API.get("/doctor/dashboard/recent-analyses");
  return res.data;
};

export const getDoctorDashboardOverview = async () => {
  const res = await API.get("/doctor/dashboard/overview");
  return res.data;
};

export const getDoctorRecentECGs = async () => {
  const res = await API.get("/doctor/dashboard/recent-ecgs");
  return res.data;
};

export const getDoctorAlerts = async () => {
  const res = await API.get("/doctor/dashboard/alerts");
  return res.data;
};

export const getDoctorWeeklyChart = async () => {
  const res = await API.get("/doctor/dashboard/charts/weekly");
  return res.data;
};

export const getDoctorDistributionChart = async () => {
  const res = await API.get("/doctor/dashboard/charts/distribution");
  return res.data;
};

export const getDoctorMonthlyTrendChart = async () => {
  const res = await API.get("/doctor/dashboard/charts/monthly-trend");
  return res.data;
};


export const getArticles = async () => {
  const res = await API.get("/articles");
  return res.data;
};

export const likeArticle = async (id: string) => {
  const res = await API.patch(`/articles/${id}/like`);
  return res.data;
};

export const addCommentToArticle = async (id: string, content: string) => {
  const res = await API.post(`/articles/${id}/comments`, { content });
  return res.data;
};

export const getArticleComments = async (id: string) => {
  const res = await API.get(`/articles/${id}/comments`);
  return res.data;
};
export const getDoctorReceivedECGs = async () => {
  const res = await API.get("/ecg/received");
  return res.data;
};

export const getDoctorMyPatients = async () => {
  const res = await API.get("/doctor/my-patients");
  return res.data;
};

export const askMedicalChatbot = async (
  question: string,
  history: { question: string; answer: string }[] = []
) => {
  const response = await API.post("/chatbot/ask", {
    question,
    history,
  });

  const data = response.data;

  return {
    answer: cleanAnswer(data.answer || ""),
    sources: extractSources(data.answer || ""),
  };
};
/* =========================
   ECG ANALYSIS (CONTRACT)
 ========================= */

export async function uploadECG({ file, patientId, title }: { file: File, patientId: string | null, title: string }) {
  const fd = new FormData();
  fd.append('image', file);
  if (patientId) fd.append('patientId', patientId);
  fd.append('title', title);
  
  const { data } = await API.post('/ecg/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  
  return data; // returns { ecg, analysis }
}

export async function getECGAnalysisDetails(id: string) {
  const { data } = await API.get(`/ecg-analysis/${id}`);
  return data;
}

export async function digitizeECGAnalysis(id: string) {
  const { data } = await API.post(`/ecg-analysis/${id}/digitize`);
  return data;
}

export async function analyzeECGWithAI(id: string) {
  const { data } = await API.post(`/ecg-analysis/${id}/analyze`);
  return data;
}

export async function saveDoctorNotes(id: string, notes: string) {
  const { data } = await API.patch(`/ecg-analysis/${id}/notes`, { notes });
  return data;
}

export async function generateReport(id: string, chatSummary?: string) {
  const { data } = await API.post(`/report/${id}`, { chatSummary });
  return data;
}

/**
 * Resolves image URLs based on source:
 * - http://localhost:8000/... → strip host prefix then re-add (normalize port)
 * - /files/... or files/...  → FastAPI Digitization (port 8000)
 * - uploads/...              → Node.js Backend (port 5000)
 */
export function getImageUrl(rawPath: string): string {
  if (!rawPath) return "";

  if (rawPath.startsWith("http://localhost:8000")) {
    rawPath = rawPath.replace("http://localhost:8000", "");
  }

  if (rawPath.startsWith("http")) return rawPath;

  if (rawPath.includes("/files/") || rawPath.startsWith("files/")) {
    const cleanPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    return `http://localhost:8000${cleanPath}`;
  }

  let cleanPath = rawPath.replace(/\\/g, "/");
  const fileName = cleanPath.split("/").pop() || "";

  if (fileName.startsWith("ecg-")) {
    cleanPath = `uploads/${fileName}`;
  } else if (cleanPath.startsWith("uploads/") && !cleanPath.startsWith("uploads/ecgs/")) {
    cleanPath = cleanPath.replace("uploads/", "uploads/ecgs/");
  }

  const normalizedPath = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  return `http://localhost:5000${normalizedPath}`;
}


function extractSources(answer: string): string[] {
  const sources: string[] = [];
  let foundSourceLine = false;

  for (const line of answer.split("\n")) {
    const l = line.toLowerCase().trim();
    if (l.startsWith("sources :") || l.startsWith("sources:")) {
      foundSourceLine = true;
      const part = line
        .split(":")
        .slice(1)
        .join(":")
        .replace(/[\[\]]/g, "")
        .trim();

      part.split(",").forEach((s) => {
        const clean = s.trim();
        if (clean && clean.length > 1) {
          sources.push(clean);
        }
      });
    }
  }

  if (!foundSourceLine) {
    return [];
  }

  return [...new Set(sources)];
}
function cleanAnswer(answer: string): string {
  return answer
    .split("\n")
    .filter((line) => {
      const l = line.toLowerCase().trim();
      return !l.startsWith("sources :") &&
             !l.startsWith("sources:") &&
             !l.startsWith("niveau de confiance");
    })
    .join("\n")
    .trim();
}

export const chatWithECG = async (
  analysisId: string,
  message: string,
  history: { role?: string; content?: string; question?: string; answer?: string }[] = []
) => {
  const res = await API.post(`/ecg-analysis/${analysisId}/chat`, {
    message,
    history,
  });
  return res.data;
};

export const getDoctorPatientDetails = async (patientId: string) => {
  const res = await API.get(`/doctor/patients/${patientId}`);
  return res.data;
};

export const deleteECGAnalysis = async (id: string) => {
  const res = await API.delete(`/ecg-analysis/${id}`);
  return res.data;
};