import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";

interface JwtPayload {
  id: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: IUser | null;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401).json({
        message: "Not authorized, no token",
      });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      res.status(401).json({
        message: "User not found",
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      message: "Not authorized, token failed",
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        message: "Not authorized",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        message: "Access denied: insufficient permissions",
      });
      return;
    }

    next();
  };
};


export const requireApprovedDoctor = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  console.log("REQ.USER =", req.user);
  console.log("ROLE =", req.user?.role);
  console.log("APPROVED =", req.user?.isApproved);

  if (!req.user) {
    return res.status(401).json({ message: "Utilisateur non authentifié" });
  }

  if (req.user.role !== "doctor") {
    return res.status(403).json({ message: "Accès réservé aux médecins" });
  }

  if (!req.user.isApproved) {
    return res.status(403).json({ message: "Médecin non approuvé" });
  }

  next();
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "Utilisateur non authentifié" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Accès réservé à l'administrateur" });
  }

  next();
};