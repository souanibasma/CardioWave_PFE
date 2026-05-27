import express from "express";
import { chatWithECG } from "../controllers/chatController";

const router = express.Router();

// POST /api/chat/:analysisId
router.post("/:analysisId", chatWithECG);

export default router;