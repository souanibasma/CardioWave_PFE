import { Request, Response } from "express";
import axios from "axios";
import path from "path";
import fs from "fs";
import FormData from "form-data";
import ECG from "../models/ECG";
import ECGAnalysis from "../models/ECGAnalysis";
import User from "../models/User";
import { createNotification } from "../utils/notificationService";

import { decryptFile } from "../utils/ecgCrypto";
const FASTAPI_URL = "http://localhost:8000";
const AI_MODEL_URL = "http://localhost:8001";
const FLASK_API_URL = "http://localhost:5002";

// Helper to get absolute path of uploaded files
const getUploadPath = (filename: string) => {
  return path.join(__dirname, "..", "uploads", filename);
};

// 0) uploadECG (combined upload + analysis creation)
export const uploadECG = async (req: Request, res: Response) => {
  try {
// ✅ GARDER
    console.log("📥 req.file:", req.file);
    console.log("📥 req.body:", req.body);
    const file = req.file as Express.Multer.File | undefined;
    let { patientId, title } = req.body;
    

    if (!file) {
      res.status(400).json({ message: "Aucun fichier envoyé" });
      return;
    }

    if (!title) {
      res.status(400).json({ message: "Le titre est requis" });
      return;
    }

    // 1. Vérifier le patient si fourni
    let finalPatientId = null;
    if (patientId && patientId !== "null" && patientId !== "undefined" && patientId !== "") {
      const patient = await User.findOne({
        _id: patientId,
        role: "patient",
        assignedDoctor: (req as any).user?._id,
      });

      if (!patient) {
        res.status(403).json({ message: "Patient non autorisé ou introuvable" });
        return;
      }
      finalPatientId = patient._id;
    }

    // 2. Créer l'ECG
    const ecg = await ECG.create({
      title,
      originalImage: `uploads/ecgs/${file.filename}`,
      patient: finalPatientId as any,
      doctor: (req as any).user?._id, // ✅ Assigne le médecin pour qu'il "possède" l'ECG
      uploadedBy: (req as any).user?._id,
    });

    // 3. Créer l'Analyse automatiquement
    const analysis = await ECGAnalysis.create({
      ecg: (ecg as any)._id, // ✅ Assertion pour accéder à _id
      status: "uploaded",
    });

    res.status(200).json({ ecg, analysis });
  } catch (error: any) {
    console.error("uploadECG error:", error);
    res.status(500).json({ message: error.message });
  }
};

// a) createAnalysisFromECG
export const createAnalysisFromECG = async (req: Request, res: Response) => {
  try {
    const { ecgId } = req.body;
    if (!ecgId) {
       res.status(400).json({ message: "ecgId requis" });
       return;
    }

    const ecg = await ECG.findById(ecgId);
    if (!ecg) {
       res.status(404).json({ message: "ECG introuvable" });
       return;
    }

    const analysis = await ECGAnalysis.create({
      ecg: ecgId,
      status: 'uploaded'
    });

    res.status(201).json(analysis);
  } catch (error: any) {
    console.error("createAnalysisFromECG error:", error);
    res.status(500).json({ message: error.message });
  }
};

// b) getECGAnalysisDetails
export const getECGAnalysisDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 1. Tenter de trouver l'analyse directement
    let analysis = await ECGAnalysis.findById(id).populate({
      path: 'ecg',
      populate: { path: 'patient', select: 'fullName' }
    });

    // 2. Si non trouvé, c'est peut-être un ID d'ECG (cas des ECG reçus sans analyse)
    if (!analysis) {
      const ecg = await require("../models/ECG").default.findById(id);
      if (ecg) {
        // Vérifier si une analyse existe déjà pour cet ECG
        analysis = await ECGAnalysis.findOne({ ecg: ecg._id });
        
        if (!analysis) {
          // Créer l'analyse uniquement si elle n'existe pas
          analysis = await ECGAnalysis.create({
            ecg: ecg._id,
            status: 'uploaded'
          });
        }

        // Re-fetch avec population
        analysis = await ECGAnalysis.findById(analysis._id).populate({
          path: 'ecg',
          populate: { path: 'patient', select: 'fullName' }
        });
      }
    }

    if (!analysis) {
      res.status(404).json({ message: "Analyse ou ECG introuvable" });
      return;
    }

    res.status(200).json(analysis);
  } catch (error) {
    console.error("getECGAnalysisDetails error:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// c) digitizeECGAnalysis
export const digitizeECGAnalysis = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 1. Tenter de trouver l'analyse par son ID ou par l'ID de l'ECG associé
    let analysis = await ECGAnalysis.findById(id).populate('ecg');
    
    if (!analysis) {
      analysis = await ECGAnalysis.findOne({ ecg: id }).populate('ecg');
    }

    if (!analysis || !analysis.ecg) {
      res.status(404).json({ message: "Analyse ou ECG introuvable" });
      return;
    }

    const ecg = analysis.ecg as any;
    const fileName = path.basename(ecg.originalImage); // Récupérer juste "ecg-123.png"

    // Liste des dossiers où chercher le fichier par ordre de priorité
    const searchDirs = [
      path.join(__dirname, "../uploads/ecgs"),   // web/backend/src/uploads/ecgs
      path.join(__dirname, "../../uploads"),      // web/backend/uploads (Root)
      path.join(__dirname, "../uploads"),        // web/backend/src/uploads
      path.join(__dirname, "../../uploads/ecgs")  // web/backend/uploads/ecgs
    ];

    let imagePath = "";
    for (const dir of searchDirs) {
      const fullPath = path.join(dir, fileName);
      if (fs.existsSync(fullPath)) {
        imagePath = fullPath;
        break;
      }
    }

    console.log(`[Digitize] File found at: ${imagePath || "NOT FOUND"}`);

    if (!imagePath) {
      res.status(404).json({ 
        message: `Fichier image original introuvable : ${fileName}`,
        details: "Le fichier n'est présent dans aucun des dossiers d'uploads configurés."
      });
      return;
    }

    // Call FastAPI
    const formData = new FormData();
    const decryptedBuffer = decryptFile(imagePath);
    formData.append('file', decryptedBuffer, { filename: fileName });
    const response = await axios.post(`${FASTAPI_URL}/digitize`, formData, {
      headers: formData.getHeaders(),
    });

    const { plot_4leads, plot_12leads, plot_full_lead_ii, npy_file } = response.data;

    analysis.plotImage = plot_4leads;
    analysis.plot12leads = plot_12leads;
    analysis.plotFullLeadII = plot_full_lead_ii;
    analysis.npyFile = npy_file;
    analysis.status = 'digitized';

    await analysis.save();

    // 🔔 Notification pour le médecin
    if (ecg.doctor) {
      await createNotification({
        recipientRole: "doctor",
        recipientId: ecg.doctor.toString(),
        type: "digitization_completed",
        title: "Digitalisation terminée",
        description: `La digitalisation de l'ECG "${ecg.title}" est terminée.`,
        actionLabel: "Voir l'analyse",
        actionPath: `/ecg-analysis/${analysis._id}`,
        relatedEcg: ecg._id,
      });
    }

    res.status(200).json(analysis);
  } catch (error: any) {
    console.error("digitizeECGAnalysis error:", error);
    res.status(500).json({ message: error.response?.data?.detail || error.message });
  }
};

// d) analyzeECGWithAI
export const analyzeECGWithAI = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const analysis = await ECGAnalysis.findById(id);
    if (!analysis) {
       res.status(404).json({ message: "Analyse introuvable" });
       return;
    }

    if (analysis.status !== 'digitized') {
       res.status(400).json({ message: "L'ECG doit être digitalisé avant l'analyse IA" });
       return;
    }

    if (!analysis.npyFile) {
       res.status(400).json({ message: "Fichier .npy manquant" });
       return;
    }

    console.log(`[AI Analyze] Downloading NPY from: ${analysis.npyFile}`);
    const npyResponse = await axios.get(analysis.npyFile, { responseType: 'arraybuffer' });
    const npyBuffer = Buffer.from(npyResponse.data);

    // 1. Call AI Classification (Port 8001)
    console.log(`[AI Analyze] Calling AI Model at ${AI_MODEL_URL}/predict`);
    const formDataAI = new FormData();
    formDataAI.append('file', npyBuffer, { filename: 'signal.npy' });
    const resAI = await axios.post(`${AI_MODEL_URL}/predict`, formDataAI, {
      headers: formDataAI.getHeaders()
    });

    // 2. Call Flask Deterministic (Port 5002)
    console.log(`[AI Analyze] Calling Deterministic Rules at ${FLASK_API_URL}/api/ecg/analyze`);
    const formDataFlask = new FormData();
    formDataFlask.append('file', npyBuffer, { filename: 'signal.npy' });
    const resFlask = await axios.post(`${FLASK_API_URL}/api/ecg/analyze`, formDataFlask, {
      headers: formDataFlask.getHeaders()
    });

    const aiData = resAI.data;
    const flaskData = resFlask.data;

    // 3. Construct aiResult for frontend (ECGAnalysis.tsx)
    const combinedResult = {
      // Metrics (source: Flask)
      heart_rate: flaskData.data?.intervals?.hr,
      pr_interval: flaskData.data?.intervals?.pr,
      qrs_duration: flaskData.data?.intervals?.qrs,
      qtc: flaskData.data?.intervals?.qtc,
      rhythm: flaskData.data?.details?.rhythm,

      // AI Classification results (source: FastAPI)
      ai_classification: {
        status: aiData.summary?.status,
        confidence: aiData.n0?.confidence,
        anomalies: aiData.summary?.anomalies || [],
        n0: aiData.n0,
        n1: aiData.n1,
        arr: aiData.arr || {},
        arr_detected: aiData.arr_detected || [],
        beat: aiData.beat || {},
        beat_detected: aiData.beat_detected || [],
      },

      // Deterministic rules results (source: Flask)
      deterministic: {
        intervals: flaskData.data?.intervals,
        diagnosis: flaskData.data?.diagnosis,
        confidence: flaskData.data?.confidence,
        details: flaskData.data?.details,
      }
    };

    analysis.aiResult = combinedResult;
    analysis.status = 'analyzed';

    await analysis.save();
    console.log(`[AI Analyze] Success for analysis ${id}`);

    // 🔔 Notification pour le médecin
    const ecg = await ECG.findById(analysis.ecg);
    if (ecg) {
      // Mettre à jour le statut global de l'ECG selon le résultat IA
      const aiStatus = aiData.summary?.status;
      const anomalies: string[] = aiData.summary?.anomalies || [];
      // NSR (Normal Sinus Rhythm) alone means the ECG is normal
      const realAnomalies = anomalies.filter((a: string) => a !== 'NSR');
      
      if (aiStatus === 'Normal' || aiStatus === 'NSR' || aiStatus === 'NORMAL' || realAnomalies.length === 0) {
        ecg.status = 'Normal';
      } else {
        ecg.status = 'Anormal';
      }

      // Mettre aussi à jour le "diagnosis" pour affichage
      const diagnosisStr = flaskData.data?.diagnosis || (ecg.status === 'Normal' ? 'Rythme sinusal normal' : aiStatus) || 'Anormal';
      ecg.diagnosis = diagnosisStr;

      await ecg.save();

      if (ecg.doctor) {
        await createNotification({
          recipientRole: "doctor",
          recipientId: ecg.doctor.toString(),
          type: "analysis_completed",
          title: "Analyse IA terminée",
          description: `L'analyse IA de l'ECG "${ecg.title}" est terminée.`,
          actionLabel: "Voir les résultats",
          actionPath: `/ecg-analysis/${analysis._id}`,
          relatedEcg: ecg._id,
        });
      }
    }

    res.status(200).json(analysis);
  } catch (error: any) {
    console.error("analyzeECGWithAI error:", error);
    res.status(500).json({ message: error.response?.data?.detail || error.message });
  }
};

// e) saveDoctorNotes
export const saveDoctorNotes = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const analysis = await ECGAnalysis.findByIdAndUpdate(id, { doctorNotes: notes }, { new: true });
    if (!analysis) {
       res.status(404).json({ message: "Analyse introuvable" });
       return;
    }

    res.status(200).json(analysis);
  } catch (error: any) {
    console.error("saveDoctorNotes error:", error);
    res.status(500).json({ message: error.message });
  }
};