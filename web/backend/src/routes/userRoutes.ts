import express, { Response } from "express";
import { protect, AuthRequest } from "../middleware/authMiddleware";
import { authorize } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/profile", protect, (req: AuthRequest, res: Response) => {
  res.status(200).json({
    message: "Protected profile route",
    user: req.user,
  });
});

router.get(
  "/admin-only",
  protect,
  authorize("admin"),
  (req: AuthRequest, res: Response) => {
    res.json({
      message: "Welcome admin",
    });
  }
);

export default router;