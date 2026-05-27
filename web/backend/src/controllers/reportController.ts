import { Request, Response } from "express";
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import ECGAnalysis from "../models/ECGAnalysis";
import { decryptFile } from "../utils/ecgCrypto";

// ── helpers ──────────────────────────────────────────────

/**
 * Résout une URL image pour les plots FastAPI (port 8000, pas d'auth requise).
 * NE PAS utiliser pour l'image ECG originale → utiliser imageToBase64().
 */
function resolveImageUrl(rawPath: string): string {
  if (!rawPath) return "";
  if (rawPath.startsWith("http")) return rawPath;
  if (rawPath.includes("/files/")) {
    const clean = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    return `http://localhost:8000${clean}`;
  }
  const clean = rawPath.replace(/\\/g, "/");
  const normalized = clean.startsWith("/") ? clean : `/${clean}`;
  return `http://localhost:5000${normalized}`;
}

/**
 * ✅ Encode l'image ECG originale en base64 pour l'inclure inline dans le PDF.
 *
 * Puppeteer ne peut PAS s'authentifier avec un token JWT pour charger
 * http://localhost:5000/uploads/ecgs/... → résultat 401 → image absente.
 * La solution correcte est d'encoder l'image directement en data URI base64.
 *
 * Recherche dans plusieurs dossiers pour couvrir :
 *   - Upload médecin → src/uploads/ecgs/
 *   - Upload patient → uploads/ecgs/ (racine backend)
 */
function imageToBase64(rawPath: string): string {
  if (!rawPath) return "";

  // Si c'est déjà une URL externe (ex: FastAPI plots), ne pas traiter ici
  if (rawPath.startsWith("http")) return "";

  const clean = rawPath.replace(/\\/g, "/");
  const fileName = path.basename(clean);

  // ✅ Mêmes dossiers de recherche que serveECG.ts
  const searchDirs = [
    path.join(process.cwd(), "src", "uploads", "ecgs"),  // médecin
    path.join(process.cwd(), "uploads", "ecgs"),          // patient
    path.join(process.cwd(), "src", "uploads"),           // fallback médecin
    path.join(process.cwd(), "uploads"),                  // fallback patient
  ];

  let filePath = "";
  for (const dir of searchDirs) {
    const candidate = path.join(dir, fileName);
    if (fs.existsSync(candidate)) {
      filePath = candidate;
      console.log(`[Report] Image ECG trouvée : ${filePath}`);
      break;
    }
  }

  if (!filePath) {
    console.warn(`[Report] ⚠️ Image ECG introuvable : ${fileName}`);
    return "";
  }

  // ✅ Déchiffrement : tente AES, sinon lit brut (rétrocompatibilité)
  let fileBuffer: Buffer;
  try {
    fileBuffer = decryptFile(filePath);
    console.log(`[Report] 🔓 Image déchiffrée : ${fileName}`);
  } catch {
    fileBuffer = fs.readFileSync(filePath);
    console.log(`[Report] 📄 Image brute : ${fileName}`);
  }

  // Détecter le type MIME selon l'extension
  const ext = path.extname(fileName).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif":  "image/gif",
    ".bmp":  "image/bmp",
    ".tiff": "image/tiff",
    ".tif":  "image/tiff",
  };
  const mime = mimeMap[ext] || "image/png";

  return `data:${mime};base64,${fileBuffer.toString("base64")}`;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const fullLabelMap: Record<string, string> = {
  // CD
  LBBB: 'Bloc de branche gauche complet',
  RBBB: 'Bloc de branche droit complet',
  BAV1: 'Bloc auriculo-ventriculaire (1er degré)',
  BAV2: 'Bloc auriculo-ventriculaire (2ème degré)',
  BAV3: 'Bloc auriculo-ventriculaire complet',
  LAFB: 'Hémibloc antérieur gauche',
  // HYP
  LVH: 'Hypertrophie ventriculaire gauche',
  RVH: 'Hypertrophie ventriculaire droite',
  RAE: 'Hypertrophie auriculaire droite',
  // IHD
  STD: 'Sous-décalage du segment ST',
  MI: 'Infarctus du myocarde',
  TWI: "Inversion de l'onde T",
  QWAVE: 'Onde Q pathologique',
  // ARR
  AFIB: 'Fibrillation atriale',
  AFLT: 'Flutter atrial',
  SVT: 'Tachycardie supraventriculaire',
  ST: 'Tachycardie sinusale',
  SB: 'Bradycardie sinusale',
  AT: 'Tachycardie atriale',
  AVNRT: 'Tachycardie par réentrée nodale',
  AVRT: 'Tachycardie par réentrée auriculo-ventriculaire',
  SA: 'Arythmie sinusale',
  // BEAT
  PAC: 'Contractions atriales prématurées (ESSV)',
  PVC: 'Contractions ventriculaires prématurées (ESV)',
  // COMMON
  NSR: 'Rythme sinusal normal',
  NORM: 'Normal',
};

function formatFullLabel(label: string) {
  return fullLabelMap[label] || label;
}

function getStatusColor(isNormal: boolean, severity: "low" | "moderate" | "high"): string {
  if (isNormal) return "#10B981"; // Emerald-500
  if (severity === "high") return "#EF4444"; // Red-500
  return "#F59E0B"; // Amber-500
}

function buildMetricRow(
  label: string,
  value: any,
  unit: string,
  min?: number,
  max?: number
): string {
  const val = Number(value);
  const isNormal = min !== undefined
    ? val >= min && val <= (max ?? Infinity)
    : val <= (max ?? Infinity);
  const statusColor = isNormal ? "#059669" : "#D97706";
  const statusLabel = isNormal ? "Normal" : val > (max ?? 0) ? "Élevé" : "Faible";

  return `
    <tr>
      <td style="padding:10px 16px;color:#334155;font-size:13px;">${label}</td>
      <td style="padding:10px 16px;font-weight:700;font-size:14px;color:#0F172A;">
        ${value ?? "—"} <span style="font-weight:400;color:#94A3B8;font-size:12px;">${unit}</span>
      </td>
      <td style="padding:10px 16px;">
        <span style="color:${statusColor};font-size:12px;font-weight:600;">${statusLabel}</span>
      </td>
    </tr>`;
}

function buildChatSummarySection(chatSummary?: string): string {
  if (!chatSummary) return "";
  return `
    <div style="margin-top:28px;">
      <h2 style="font-size:16px;font-weight:700;color:#0F172A;margin:0 0 12px;
                 padding-bottom:8px;border-bottom:2px solid #E2E8F0;">
        Résumé de la consultation IA
      </h2>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;
                  padding:16px;font-size:13px;color:#334155;line-height:1.7;white-space:pre-wrap;">
        ${chatSummary}
      </div>
    </div>`;
}

function buildAnomaliesSection(isNormal: boolean, realAnomalies: string[]): string {
  if (isNormal) {
    return `
      <div style="margin-top:20px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:12px 16px;">
        <div style="font-weight:700;color:#047857;font-size:13px;">
          ✓ Rythme sinusal normal — Aucune anomalie détectée
        </div>
      </div>
    `;
  }

  if (realAnomalies.length === 0) {
     return `
      <div style="margin-top:20px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:12px 16px;">
        <div style="font-weight:700;color:#B91C1C;font-size:13px;">
          ⚠️ Tracé suspect ou anormal, mais aucune anomalie spécifique catégorisée.
        </div>
      </div>
    `;
  }

  return `
    <div style="margin-top:20px;">
      <h3 style="font-size:14px;font-weight:700;color:#0F172A;margin:0 0 10px;">
        Détections Spécifiques
      </h3>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${realAnomalies.map(anomaly => `
          <div style="background:#FEF2F2;border:1px solid #FECACA;color:#B91C1C;
                      padding:6px 12px;border-radius:6px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:6px;height:6px;background:#EF4444;border-radius:50%;"></span>
            ${formatFullLabel(anomaly)}
          </div>
        `).join("")}
      </div>
    </div>`;
}

// ── HTML template ─────────────────────────────────────────

function buildHTML(analysis: any, chatSummary?: string): string {
  const ecg = analysis.ecg || {};
  const aiResult = analysis.aiResult || {};
  const aiClass = aiResult.ai_classification || {};
  const deterministic = aiResult.deterministic || {};
  
  // ───────────────────────────────────────────
  // LOGIQUE COHÉRENTE AVEC L'UI (isEffectivelyNormal)
  // ───────────────────────────────────────────
  let isEffectivelyNormal = true;
  let realAnomalies: string[] = [];

  if (aiClass) {
    if (aiClass.status === "ANORMAL") {
      const rawAnomalies = aiClass.anomalies?.length > 0
        ? aiClass.anomalies
        : (aiClass.n1?.positives ? Object.values(aiClass.n1.positives).flat() : []);
      
      realAnomalies = rawAnomalies.filter((a: string) => a !== "NSR");
      if (realAnomalies.length > 0) {
        isEffectivelyNormal = false;
      }
    }
  }

  // Sévérité
  const abnormalProb = aiClass.n0?.probability_abnormal || 0;
  const severity: "low" | "moderate" | "high" = !isEffectivelyNormal
    ? (abnormalProb > 0.8 ? "high" : "moderate")
    : "low";

  const metrics = {
    hr: aiResult.heart_rate ?? aiResult.hr ?? "—",
    pr: aiResult.pr_interval ?? aiResult.pr ?? "—",
    qrs: aiResult.qrs_duration ?? aiResult.qrs ?? "—",
    qtc: aiResult.qtc ?? "—",
  };

  // ✅ Image ECG originale en base64 (évite l'erreur 401 de Puppeteer)
  const originalImage = imageToBase64(ecg.originalImage || "");
  // ✅ Plots FastAPI restent en URL HTTP (port 8000, pas d'auth)
  const plot4leads  = resolveImageUrl(analysis.plotImage || "");
  const plot12leads = resolveImageUrl(analysis.plot12leads || "");
  const plotLeadII  = resolveImageUrl(analysis.plotFullLeadII || "");

  const statusColor = getStatusColor(isEffectivelyNormal, severity);
  const confidence = aiClass.n0?.confidence || aiClass.confidence
    ? `${((aiClass.n0?.confidence || aiClass.confidence) * 100).toFixed(1)}%`
    : "—";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #fff;
      color: #0F172A;
      font-size: 13px;
    }
    .page { padding: 40px 48px; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    h2 { font-size: 16px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    tr:nth-child(even) { background: #F8FAFC; }
    img { max-width: 100%; border-radius: 8px; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>
<div class="page">

  <!-- ── EN-TÊTE ── -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;
              padding-bottom:20px;border-bottom:3px solid #0F172A;margin-bottom:28px;">
    <div>
      <h1>Rapport d'Analyse ECG</h1>
      <p style="color:#64748B;margin-top:6px;font-size:13px;">
        Généré le ${formatDate(new Date())}
      </p>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;
                  letter-spacing:0.5px;margin-bottom:4px;">ID Analyse</div>
      <div style="font-size:12px;font-weight:600;color:#334155;">${analysis._id}</div>
    </div>
  </div>

  <!-- ── INFOS PATIENT ── -->
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;
              padding:20px 24px;margin-bottom:28px;">
    <h2 style="margin-bottom:14px;color:#0F172A;">Informations patient</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
      <div>
        <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;
                    letter-spacing:0.5px;margin-bottom:4px;">Patient</div>
        <div style="font-weight:600;font-size:14px;">
          ${ecg.patient?.fullName || "Non renseigné"}
        </div>
      </div>
      <div>
        <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;
                    letter-spacing:0.5px;margin-bottom:4px;">Titre ECG</div>
        <div style="font-weight:600;font-size:14px;">${ecg.title || "—"}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;
                    letter-spacing:0.5px;margin-bottom:4px;">Date d'analyse</div>
        <div style="font-weight:600;font-size:14px;">
          ${ecg.createdAt ? formatDate(ecg.createdAt) : "—"}
        </div>
      </div>
    </div>
  </div>

  <!-- ── RÉSULTAT IA ── -->
  ${analysis.status === "analyzed" || analysis.status === "digitized" ? `
  <div style="border-left:6px solid ${statusColor};background:${isEffectivelyNormal ? "#ECFDF5" : "#FEF2F2"};
              border-radius:0 12px 12px 0;padding:20px 24px;margin-bottom:28px;">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:11px;color:#64748B;text-transform:uppercase;
                    letter-spacing:0.5px;margin-bottom:6px;">Classification IA</div>
        <div style="font-size:26px;font-weight:900;color:${statusColor};letter-spacing:-0.5px;">
          ${isEffectivelyNormal ? "ECG Normal" : "Anomalies Détectées"}
        </div>
        <div style="font-size:13px;color:#64748B;margin-top:4px;display:flex;align-items:center;gap:12px;">
          <span>Confiance du modèle : <strong style="color:#0F172A;">${confidence}</strong></span>
          ${!isEffectivelyNormal ? `
          <span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;
                       ${severity === "high" ? "background:#FEE2E2;color:#B91C1C;" : "background:#FEF3C7;color:#B45309;"}">
            Danger ${severity === "high" ? "élevé" : "modéré"}
          </span>
          ` : ""}
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#64748B;margin-bottom:4px;">Statut</div>
        <span style="background:#EFF6FF;color:#1D4ED8;padding:4px 12px;
                     border-radius:20px;font-size:12px;font-weight:700;
                     border:1px solid #BFDBFE;">Analysé par IA</span>
      </div>
    </div>
    ${buildAnomaliesSection(isEffectivelyNormal, realAnomalies)}
  </div>
  ` : `
  <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;
              padding:16px 20px;margin-bottom:28px;color:#92400E;font-size:13px;">
    Analyse IA non encore effectuée pour ce dossier.
  </div>
  `}

  <!-- ── MÉTRIQUES ── -->
  <div style="margin-bottom:28px;">
    <h2 style="margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #E2E8F0;">
      Métriques cliniques
    </h2>
    <table style="border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;">
      <thead>
        <tr style="background:#F1F5F9;">
          <th style="padding:10px 16px;text-align:left;font-size:12px;
                     color:#64748B;font-weight:600;">Paramètre</th>
          <th style="padding:10px 16px;text-align:left;font-size:12px;
                     color:#64748B;font-weight:600;">Valeur</th>
          <th style="padding:10px 16px;text-align:left;font-size:12px;
                     color:#64748B;font-weight:600;">Statut</th>
        </tr>
      </thead>
      <tbody>
        ${buildMetricRow("Fréquence cardiaque", metrics.hr, "bpm", 60, 100)}
        ${buildMetricRow("Intervalle PR", metrics.pr, "ms", 120, 200)}
        ${buildMetricRow("Durée QRS", metrics.qrs, "ms", 60, 100)}
        ${buildMetricRow("QTc", metrics.qtc, "ms", undefined, 450)}
        ${deterministic.diagnosis ? `
        <tr>
          <td style="padding:10px 16px;color:#334155;font-size:13px;">
            Diagnostic déterministe
          </td>
          <td colspan="2" style="padding:10px 16px;font-weight:700;font-size:13px;color:#0F172A;">
            ${Array.isArray(deterministic.diagnosis) 
                ? deterministic.diagnosis.join("<br/>") 
                : deterministic.diagnosis}
          </td>
        </tr>` : ""}
        ${deterministic.details?.rhythm ? `
        <tr>
          <td style="padding:10px 16px;color:#334155;font-size:13px;">Rythme</td>
          <td colspan="2" style="padding:10px 16px;font-size:13px;color:#0F172A;font-weight:600;">
            ${deterministic.details.rhythm}
          </td>
        </tr>` : ""}
      </tbody>
    </table>
  </div>

  <!-- ── RECOMMANDATIONS / RÈGLES ── -->
  ${!isEffectivelyNormal && deterministic.diagnosis ? `
  <div style="margin-bottom:28px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px 24px;">
    <h2 style="margin-bottom:12px;color:#0F172A;font-size:15px;display:flex;align-items:center;gap:8px;">
      <span style="background:#E0E7FF;color:#4338CA;border-radius:50%;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;">ℹ</span>
      Interprétation Basée sur les Règles (Déterministe)
    </h2>
    <div style="font-size:13px;color:#334155;line-height:1.6;">
      Les règles médicales classiques ont détecté les éléments suivants dans le signal :
      <ul style="margin-top:8px;padding-left:20px;color:#0F172A;font-weight:500;">
        ${Array.isArray(deterministic.diagnosis) 
            ? deterministic.diagnosis.map((d: string) => `<li style="margin-bottom:4px;">${d}</li>`).join("")
            : `<li>${deterministic.diagnosis}</li>`}
      </ul>
    </div>
  </div>
  ` : ""}

  <!-- ── NOTES MÉDECIN ── -->
  ${analysis.doctorNotes ? `
  <div style="margin-bottom:28px;">
    <h2 style="margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #E2E8F0;">
      Notes du médecin
    </h2>
    <div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:10px;
                padding:16px;font-size:13px;color:#0C4A6E;line-height:1.7;
                white-space:pre-wrap;">
      ${analysis.doctorNotes}
    </div>
  </div>` : ""}

  <!-- ── RÉSUMÉ CHAT ── -->
  ${buildChatSummarySection(chatSummary)}

  <!-- ── PAGE 2 : PLOTS ECG ── -->
  ${(plot4leads || plot12leads || plotLeadII || originalImage) ? `
  <div class="page-break" style="margin-top:40px;">
    <h2 style="margin-bottom:20px;padding-bottom:8px;border-bottom:2px solid #E2E8F0;">
      Visualisations ECG
    </h2>

    ${originalImage ? `
    <div style="margin-bottom:24px;">
      <div style="font-size:12px;color:#64748B;text-transform:uppercase;
                  letter-spacing:0.5px;margin-bottom:8px;font-weight:600;">
        ECG Original
      </div>
      <img src="${originalImage}" style="width:100%;border:1px solid #E2E8F0;"/>
    </div>` : ""}

    ${plot4leads ? `
    <div style="margin-bottom:24px;">
      <div style="font-size:12px;color:#64748B;text-transform:uppercase;
                  letter-spacing:0.5px;margin-bottom:8px;font-weight:600;">
        Signal digitalisé — 4 dérivations
      </div>
      <img src="${plot4leads}" style="width:100%;border:1px solid #E2E8F0;"/>
    </div>` : ""}

    ${plot12leads ? `
    <div style="margin-bottom:24px;">
      <div style="font-size:12px;color:#64748B;text-transform:uppercase;
                  letter-spacing:0.5px;margin-bottom:8px;font-weight:600;">
        Reconstruction 12 dérivations
      </div>
      <img src="${plot12leads}" style="width:100%;border:1px solid #E2E8F0;"/>
    </div>` : ""}

    ${plotLeadII ? `
    <div style="margin-bottom:24px;">
      <div style="font-size:12px;color:#64748B;text-transform:uppercase;
                  letter-spacing:0.5px;margin-bottom:8px;font-weight:600;">
        Dérivation II continue (Full Lead II)
      </div>
      <img src="${plotLeadII}" style="width:100%;border:1px solid #E2E8F0;"/>
    </div>` : ""}
  </div>` : ""}

  <!-- ── PIED DE PAGE ── -->
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #E2E8F0;
              display:flex;justify-content:space-between;color:#94A3B8;font-size:11px;">
    <span>Rapport généré automatiquement — ECG Cascade Pipeline</span>
    <span>Document confidentiel — Usage médical uniquement</span>
  </div>

</div>
</body>
</html>`;
}

// ── Controller ────────────────────────────────────────────

export const generateReport = async (req: Request, res: Response) => {
  try {
    const { analysisId } = req.params;
    const { chatSummary } = req.body || {}; // Optionnel, éviter l'erreur si body est vide

    // 1. Récupérer l'analyse depuis MongoDB
    const analysis = await ECGAnalysis.findById(analysisId).populate({
      path: "ecg",
      populate: { path: "patient", select: "fullName" },
    });

    if (!analysis) {
      return res.status(404).json({ message: "Analyse introuvable" });
    }

    // 2. Créer le dossier reports s'il n'existe pas
    const reportsDir = path.join(__dirname, "..", "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // 3. Générer le HTML
    const html = buildHTML(analysis.toObject(), chatSummary);

    // 4. Lancer Puppeteer et générer le PDF
    let browser;
    let fileName = `ecg_${analysisId}_report.pdf`;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });

      const page = await browser.newPage();
      // Augmenter le timeout à 60s pour les connexions lentes ou gros rapports
      page.setDefaultNavigationTimeout(60000);
      
      await page.setContent(html, { waitUntil: "networkidle2" });

      const filePath = path.join(reportsDir, fileName);

      await page.pdf({
        path: filePath,
        format: "A4",
        margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
        printBackground: true,
      });

      await browser.close();
    } catch (pdfError: any) {
      if (browser) await browser.close();
      console.error("[Puppeteer Error]:", pdfError);
      throw new Error(`Échec Puppeteer : ${pdfError.message}`);
    }

    // 5. Sauvegarder l'URL dans MongoDB
    const reportUrl = `/uploads/reports/${fileName}`;
    await analysis.updateOne({ reportUrl });
    // 6. Retourner l'URL au frontend
    return res.status(200).json({
      message: "Rapport généré avec succès",
      reportUrl: `http://localhost:5000${reportUrl}`,
    });
  } catch (error: any) {
    console.error("[reportController] Final Error:", error);
    return res.status(500).json({
      message: "Erreur génération PDF",
      error: error.message,
    });
  }
};