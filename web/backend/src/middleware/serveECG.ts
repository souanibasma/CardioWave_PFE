import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";
import path from "path";
import fs from "fs";
import { decryptFile } from "../utils/ecgCrypto";

/**
 * Middleware sécurisé pour servir les fichiers ECG.
 *
 * ✅ Recherche dans plusieurs dossiers pour couvrir :
 *   - Upload médecin (via ecgUploadMiddleware) → src/uploads/ecgs/
 *   - Upload patient (via patientRoutes multer) → uploads/ecgs/ (racine backend)
 *
 * ✅ Tente le déchiffrement AES, sinon sert le fichier brut (rétrocompatibilité)
 * ✅ Sécurité : seuls doctor et admin peuvent appeler cette route (enforce dans ecgFileRoutes)
 */
export const serveECGFile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {

  const rawFilename = req.params.filename;
  const filename = Array.isArray(rawFilename) ? rawFilename[0] : rawFilename;
  const safeName = path.basename(filename); // Sécurité : empêche path traversal

  // ✅ Dossiers de recherche dans l'ordre de priorité
  // 1. Upload médecin (ecgUploadMiddleware stocke dans src/uploads/ecgs/)
  // 2. Upload patient (multer dans patientRoutes stocke dans uploads/ecgs/ depuis process.cwd())
  const searchDirs = [
    path.join(process.cwd(), "src", "uploads", "ecgs"),  // médecin (via ecgUploadMiddleware)
    path.join(process.cwd(), "uploads", "ecgs"),          // patient (via patientRoutes)
    path.join(process.cwd(), "src", "uploads"),           // fallback médecin sans sous-dossier
    path.join(process.cwd(), "uploads"),                  // fallback patient sans sous-dossier
  ];

  let filePath = "";
  for (const dir of searchDirs) {
    const candidate = path.join(dir, safeName);
    if (fs.existsSync(candidate)) {
      filePath = candidate;
      console.log(`📁 ECG trouvé : ${filePath}`);
      break;
    }
  }

  if (!filePath) {
    console.warn(`⚠️ Fichier ECG introuvable : ${safeName}`);
    console.warn(`   Dossiers recherchés :`);
    searchDirs.forEach(d => console.warn(`   - ${path.join(d, safeName)}`));
    res.status(404).json({ message: "Fichier introuvable" });
    return;
  }

  // ✅ Déchiffrement : tente AES, sinon sert le fichier brut (anciens fichiers non chiffrés)
  let fileBuffer: Buffer;
  try {
    fileBuffer = decryptFile(filePath);
    console.log(`🔓 Fichier déchiffré : ${safeName}`);
  } catch (err) {
    console.log(`📄 Fichier brut servi (non chiffré) : ${safeName}`);
    fileBuffer = fs.readFileSync(filePath);
  }

  // ✅ Type MIME selon extension
  const ext = path.extname(safeName).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif":  "image/gif",
    ".bmp":  "image/bmp",
    ".tiff": "image/tiff",
    ".tif":  "image/tiff",
    ".dcm":  "application/dicom",
  };

  const mimeType = mimeTypes[ext] || "application/octet-stream";
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Length", fileBuffer.length);
  res.send(fileBuffer);
};