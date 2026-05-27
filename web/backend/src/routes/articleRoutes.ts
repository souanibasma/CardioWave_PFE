import express from "express";
import {
  getAllArticlesAdmin,
  getArticleByIdAdmin,
  createArticle,
  updateArticle,
  deleteArticle,
  getArticleStats,
  deleteArticleCommentByAdmin,
} from "../controllers/articleController";
import { protect, requireAdmin } from "../middleware/authMiddleware";

const router = express.Router();

// GET /api/admin/articles
router.get("/", protect, requireAdmin, getAllArticlesAdmin);

// GET /api/admin/articles/:id
router.get("/:id", protect, requireAdmin, getArticleByIdAdmin);

// POST /api/admin/articles
router.post("/", protect, requireAdmin, createArticle);

// PUT /api/admin/articles/:id
router.put("/:id", protect, requireAdmin, updateArticle);

// DELETE /api/admin/articles/:id
router.delete("/:id", protect, requireAdmin, deleteArticle);

// GET /api/admin/articles/:id/stats
router.get("/:id/stats", protect, requireAdmin, getArticleStats);

// DELETE /api/admin/articles/:id/comments/:commentId
router.delete("/:id/comments/:commentId", protect, requireAdmin, deleteArticleCommentByAdmin);

export default router;