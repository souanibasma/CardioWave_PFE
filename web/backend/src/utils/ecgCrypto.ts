import crypto from "crypto";
import fs from "fs";

const ALGORITHM = "aes-256-cbc";
const encryptionKey = process.env.ECG_ENCRYPTION_KEY || "default_secret_key_32_characters_!!";
const KEY = Buffer.from(encryptionKey, "utf8"); // 32 chars

// Chiffrer un fichier
export const encryptFile = (inputPath: string): void => {
  const iv = crypto.randomBytes(16); // vecteur d'initialisation aléatoire
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  const input = fs.readFileSync(inputPath);
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);

  // On sauvegarde : IV (16 bytes) + données chiffrées
  const result = Buffer.concat([iv, encrypted]);
  fs.writeFileSync(inputPath, result);
};

// Déchiffrer un fichier (retourne un Buffer en mémoire)
export const decryptFile = (filePath: string): Buffer => {
  const data = fs.readFileSync(filePath);

  const iv = data.slice(0, 16);           // premiers 16 bytes = IV
  const encrypted = data.slice(16);       // reste = données chiffrées

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted;
};