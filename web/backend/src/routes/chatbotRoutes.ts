import express from "express";
import { askChatbot } from "../controllers/chatbotController";

const router = express.Router();

router.post("/ask", askChatbot);

export default router;