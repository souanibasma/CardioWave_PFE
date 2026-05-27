import express from "express";
import {
  getPublishedArticles,
  getArticleComments,
  addCommentToArticle,
  likeArticle,
} from "../controllers/articleController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

// Lire les articles publiés
router.get("/", protect, getPublishedArticles);

// Lire les commentaires d’un article
router.get("/:id/comments", protect, getArticleComments);

// Ajouter un commentaire
router.post("/:id/comments", protect, addCommentToArticle);

// Liker un article
router.patch("/:id/like", protect, likeArticle);

export default router;