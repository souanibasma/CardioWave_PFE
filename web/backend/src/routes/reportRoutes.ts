import express from "express";
import { generateReport } from "../controllers/reportController";

const router = express.Router();

// POST /api/report/:analysisId
router.post("/:analysisId", generateReport);

export default router;