import multer from "multer";
import path from "path";
import fs from "fs";
// ✅ Ajoute NextFunction ici
import { Request, Response, NextFunction } from "express";
import { encryptFile } from "../utils/ecgCrypto";
const uploadDir = path.join(__dirname, "../uploads/ecgs");

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
  if (file.mimetype.startsWith("image/") || file.originalname.toLowerCase().endsWith(".dcm")) {
    cb(null, true);
  } else {
    cb(new Error("Seules les images et fichiers DICOM sont autorisés"));
  }
};

const uploadECGFile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Ajoute ce middleware APRÈS uploadECGFile
export const encryptAfterUpload = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.file) {
    encryptFile(req.file.path);  // chiffre le fichier sur disque
    console.log("🔒 Fichier ECG chiffré :", req.file.filename);
  }
  next();
};
export default uploadECGFile;
