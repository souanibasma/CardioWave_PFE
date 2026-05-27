import express from "express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Routes
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import adminRoutes from "./routes/adminRoutes";
import doctorRoutes from "./routes/doctorRoutes";
import patientRoutes from "./routes/patientRoutes";
import articleRoutes from "./routes/articleRoutes";
import publicArticleRoutes from "./routes/publicArticleRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import doctorDashboardRoutes from "./routes/doctorDashboardRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import ecgAnalysisRoutes from "./routes/ecgAnalysisRoutes";
import chatRoutes from "./routes/chatRoutes";
import chatbotRoutes from "./routes/chatbotRoutes";
import reportRoutes from "./routes/reportRoutes";
import doctorPatientsRoutes from "./routes/doctorPatients.routes";
import ecgFileRoutes from "./routes/ecgFileRoutes";

const app = express();

// ✅ Sécurité
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false  // ✅ AJOUTER
}));
// ✅ Rate limiting global
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: "Trop de requêtes, réessaie dans 1 minute" }
}));

// ✅ Anti brute-force login
app.use("/api/auth/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Trop de tentatives, réessaie dans 15 minutes" }
}));

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Backend is running");
});

// ✅ Fichiers ECG protégés
app.use("/uploads", ecgFileRoutes);

// Auth & core
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/doctor", doctorRoutes);
console.log("🔧 Mounting patient routes on /api/patient");
app.use("/api/patient", patientRoutes);

// ECG
app.use("/api/ecg", ecgAnalysisRoutes);
app.use("/api/ecg-analysis", ecgAnalysisRoutes);

// Dashboard
app.use("/api/doctor/dashboard", doctorDashboardRoutes);

// Notifications
app.use("/api/notifications", notificationRoutes);

// Articles
app.use("/api/admin/articles", articleRoutes);
app.use("/api/articles", publicArticleRoutes);

// Chatbot & Chat
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/chat", chatRoutes);

// Reports
app.use("/uploads/reports", express.static(path.join(__dirname, "reports")));
app.use("/api/report", reportRoutes);

// Doctor patients
app.use("/api/doctor", doctorPatientsRoutes);

export default app;