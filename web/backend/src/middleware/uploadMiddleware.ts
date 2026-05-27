import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

// ── Articles ──────────────────────────────────────────────
const uploadDir = path.join(__dirname, "../uploads/articles");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (
    _req: Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    cb(null, uploadDir);
  },
  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, uniqueName);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Seules les images sont autorisées"));
  }
};

const uploadArticleImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default uploadArticleImage;

// ── ECG patient uploads ───────────────────────────────────
const ecgUploadDir = path.join(__dirname, "../uploads/ecgs");
if (!fs.existsSync(ecgUploadDir)) {
  fs.mkdirSync(ecgUploadDir, { recursive: true });
}

const ecgStorage = multer.diskStorage({
  destination: (
    _req: Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    cb(null, ecgUploadDir);
  },
  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const cleanName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${cleanName}`);
  },
});

const ecgFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Seules les images ECG sont autorisées"));
  }
};

export const uploadEcg = multer({
  storage: ecgStorage,
  fileFilter: ecgFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});