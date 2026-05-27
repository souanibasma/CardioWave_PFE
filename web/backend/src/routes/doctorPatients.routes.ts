import { Router } from "express";
import {
  getDoctorPatientById,
  getDoctorPatients,
} from "../controllers/doctorPatients.controller";
import { protect } from "../middleware/authMiddleware";

const router = Router();

router.get("/patients", protect, getDoctorPatients);
router.get("/patients/:patientId", protect, getDoctorPatientById);

export default router;