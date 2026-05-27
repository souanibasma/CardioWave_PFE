import express from "express";
import { protect, authorize } from "../middleware/authMiddleware";
import { serveECGFile } from "../middleware/serveECG";

const router = express.Router();

router.get("/ecgs/:filename", protect, authorize("doctor", "admin"), serveECGFile);
export default router;  