import express from "express";
import multer from "multer";
import path from "path";
import {
  getPatientProfile,
  updatePatientProfile,
  getApprovedDoctors,
  assignDoctorToPatient,
  getMyDoctor,
  uploadPatientECG,
  getPatientECGs,
  getPatientECGById,
  deletePatientECG,
  changePatientPassword,
  getPatientECGStats,
} from "../controllers/patientController";
import { protect } from "../middleware/authMiddleware"; // Adapter selon votre structure

const router = express.Router();

import fs from "fs";

// ══════════════════════════════════════════════════════════════
// CONFIGURATION MULTER - Upload de fichiers ECG
// ══════════════════════════════════════════════════════════════

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    // Assurez-vous que ce dossier existe ou créez-le
    const dir = "uploads/ecgs/";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (_req, file, cb) {
    // Génère un nom unique: timestamp + extension originale
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "ecg-" + uniqueSuffix + ext);
  },
});

// Filtrage des fichiers (seulement les images)
const fileFilter = (
  _req: express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Seules les images sont autorisées (jpg, png, gif, etc.)"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// ══════════════════════════════════════════════════════════════
// ROUTES PATIENT
// ══════════════════════════════════════════════════════════════

// Profil
router.get("/profile", protect, getPatientProfile);
router.put("/profile", protect, updatePatientProfile);
router.put("/change-password", protect, changePatientPassword);

// Médecins
router.get("/doctors", protect, getApprovedDoctors);
router.put("/assign-doctor/:doctorId", protect, assignDoctorToPatient);
router.get("/my-doctor", protect, getMyDoctor);

// ECG - ⚠️ IMPORTANT: upload.single("file") AVANT le contrôleur
router.post("/ecgs", protect, upload.single("file"), uploadPatientECG);
router.get("/ecgs", protect, getPatientECGs);
router.get("/ecgs/stats", protect, getPatientECGStats);
router.get("/ecgs/:id", protect, getPatientECGById);
router.delete("/ecgs/:id", protect, deletePatientECG);

export default router;