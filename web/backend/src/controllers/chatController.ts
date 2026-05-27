import { Request, Response } from "express";
import axios from "axios";
import ECGAnalysis from "../models/ECGAnalysis";


export const chatWithECG = async (req: Request, res: Response) => {
  try {
    const { analysisId } = req.params;
    const { message, history } = req.body;

    // 1. Get ECGAnalysis from DB
    let analysis = await ECGAnalysis.findById(analysisId).populate("ecg");

    // Fallback: If not found, maybe the provided ID is an ECG ID
    if (!analysis) {
      analysis = await ECGAnalysis.findOne({ ecg: analysisId }).populate("ecg");
    }

    if (!analysis) {
      return res.status(404).json({ message: "Analysis not found" });
    }

    // 2. Prepare context
    const aiResult = analysis.aiResult || {};
    const doctorNotes = analysis.doctorNotes || "";

    // 3. Call FastAPI chatbot
    const response = await axios.post("http://localhost:8003/chat", {
      message,
      aiResult,
      doctorNotes,
      history
    });

    return res.json(response.data);

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      message: "Chat error",
      error: error.message
    });
  }
};