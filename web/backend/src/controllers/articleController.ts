import { Response } from "express";
import Article from "../models/Article";
import { AuthRequest } from "../middleware/authMiddleware";

// GET /api/admin/articles
export const getAllArticlesAdmin = async (_req: AuthRequest, res: Response) => {
  try {
    const articles = await Article.find()
      .populate("author", "fullName email role")
      .sort({ createdAt: -1 });

    res.status(200).json(articles);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des articles" });
  }
};

// GET /api/admin/articles/:id
export const getArticleByIdAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const article = await Article.findById(req.params.id).populate(
      "author",
      "fullName email role"
    );

    if (!article) {
      return res.status(404).json({ message: "Article introuvable" });
    }

    res.status(200).json(article);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de l'article" });
  }
};

// POST /api/admin/articles
export const createArticle = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, category, coverImage } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    if (!title || !content || !category) {
      return res.status(400).json({
        message: "title, content et category sont obligatoires",
      });
    }

    const article = await Article.create({
      title,
      content,
      category,
      coverImage: coverImage || "",
      author: req.user._id,
      isPublished: true,
    });

    const created = await Article.findById(article._id).populate(
      "author",
      "fullName email role"
    );

    res.status(201).json({
      message: "Article créé avec succès",
      article: created,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création de l'article" });
  }
};

// PUT /api/admin/articles/:id
export const updateArticle = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, category, coverImage, isPublished } = req.body;

    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ message: "Article introuvable" });
    }

    if (title !== undefined) article.title = title;
    if (content !== undefined) article.content = content;
    if (category !== undefined) article.category = category;
    if (coverImage !== undefined) article.coverImage = coverImage;
    if (typeof isPublished === "boolean") article.isPublished = isPublished;

    await article.save();

    const updated = await Article.findById(article._id).populate(
      "author",
      "fullName email role"
    );

    res.status(200).json({
      message: "Article modifié avec succès",
      article: updated,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la modification de l'article" });
  }
};

// DELETE /api/admin/articles/:id
export const deleteArticle = async (req: AuthRequest, res: Response) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ message: "Article introuvable" });
    }

    await article.deleteOne();

    res.status(200).json({ message: "Article supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression de l'article" });
  }
};

export const getArticleStats = async (req: AuthRequest, res: Response) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate("comments.author", "fullName email")
      .select("likes comments title");

    if (!article) {
      return res.status(404).json({
        message: "Article introuvable",
      });
    }

    res.status(200).json({
      likes: article.likes || 0,
      comments: article.comments || [],
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des statistiques de l'article",
    });
  }
};

// DELETE /api/admin/articles/:id/comments/:commentId
export const deleteArticleCommentByAdmin = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id, commentId } = req.params;

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        message: "Article introuvable",
      });
    }

    const commentExists = article.comments.some(
      (comment: any) => comment._id?.toString() === commentId
    );

    if (!commentExists) {
      return res.status(404).json({
        message: "Commentaire introuvable",
      });
    }

    article.comments = article.comments.filter(
      (comment: any) => comment._id?.toString() !== commentId
    ) as any;

    await article.save();

    res.status(200).json({
      message: "Commentaire supprimé avec succès",
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la suppression du commentaire",
    });
  }
};

// POST /api/articles/:id/comments
export const addCommentToArticle = async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: "Le contenu du commentaire est obligatoire",
      });
    }

    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        message: "Article introuvable",
      });
    }

    article.comments.unshift({
      content: content.trim(),
      author: req.user?._id,
      createdAt: new Date(),
    } as any);

    await article.save();

    const updatedArticle = await Article.findById(req.params.id)
      .populate("comments.author", "fullName email");

    res.status(201).json({
      message: "Commentaire ajouté avec succès",
      comments: updatedArticle?.comments || [],
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de l'ajout du commentaire",
    });
  }
};

// PATCH /api/articles/:id/like
export const likeArticle = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        message: "Article introuvable",
      });
    }

    const alreadyLiked = article.likes.some(
      (id: any) => id.toString() === userId?.toString()
    );

    if (alreadyLiked) {
      article.likes = article.likes.filter(
        (id: any) => id.toString() !== userId?.toString()
      ) as any;
    } else {
      article.likes.push(userId as any);
    }

    await article.save();

    res.status(200).json({
      message: alreadyLiked ? "Like retiré" : "Article liké avec succès",
      likes: article.likes.length,
      liked: !alreadyLiked,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors du like de l'article",
    });
  }
};

// GET /api/articles
// GET /api/articles
export const getPublishedArticles = async (req: AuthRequest, res: Response) => {
  try {
    const articles = await Article.find({ isPublished: true })
      .populate("author", "fullName email role")
      .populate("comments.author", "fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json(articles);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des articles publiés",
    });
  }
};
// GET /api/articles/:id/comments
export const getArticleComments = async (req: AuthRequest, res: Response) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate("comments.author", "fullName email");

    if (!article) {
      return res.status(404).json({
        message: "Article introuvable",
      });
    }

    res.status(200).json({
      comments: article.comments || [],
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des commentaires",
    });
  }
};

