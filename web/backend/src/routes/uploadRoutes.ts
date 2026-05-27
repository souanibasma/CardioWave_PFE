import express, { Request, Response } from "express";
import uploadArticleImage from "../middleware/uploadMiddleware";
import { protect, requireAdmin } from "../middleware/authMiddleware";

const router = express.Router();

router.post(
  "/article-image",
  protect,
  requireAdmin,
  uploadArticleImage.single("image"),
  (req: Request, res: Response) => {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({
        message: "Aucune image envoyée",
      });
    }

    return res.status(200).json({
      message: "Image uploadée avec succès",
      imageUrl: `/uploads/articles/${file.filename}`,
    });
  }
);

export default router;