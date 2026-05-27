import { Request, Response } from 'express';
import ECG from '../models/ECG';
import ECGAnalysis from '../models/ECGAnalysis';
import mongoose from 'mongoose';

export const getDoctorDashboardOverview = async (req: Request, res: Response) => {
  try {
    const doctorId = (req as any).user._id;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [receivedToday, pendingAnalyses] = await Promise.all([
      ECG.countDocuments({
        doctor: doctorId,
        createdAt: { $gte: startOfDay }
      }),
      ECG.countDocuments({
        doctor: doctorId,
        status: { $in: ['En attente', 'pending'] }
      })
    ]);

    res.json({
      receivedToday,
      pendingAnalyses,
      // For frontend compatibility, providing 0 for removed stats
      abnormalDetected: 0,
      activePatients: 0
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getDoctorRecentECGs = async (req: Request, res: Response) => {
  try {
    const doctorId = (req as any).user._id;
    const ecgs = await ECG.find({ doctor: doctorId })
      .sort({ createdAt: -1 })
      .limit(2)
      .populate('patient', 'fullName prenom nom dateOfBirth phone');

    const formatted = ecgs.map(e => {
      const patient: any = e.patient;
      let age = null;
      if (patient && patient.dateOfBirth) {
        const birth = new Date(patient.dateOfBirth);
        const now = new Date();
        age = now.getFullYear() - birth.getFullYear();
      }

      let statut = e.status === 'Anormal' ? 'Anormal' : (e.status === 'Normal' ? 'Normal' : 'En attente');
      if (statut === 'Anormal' && e.diagnosis && (
        e.diagnosis.toLowerCase().includes('rythme sinusal normal') ||
        e.diagnosis.toLowerCase().includes('normal sinus rhythm') ||
        e.diagnosis === 'NSR' ||
        e.diagnosis === 'Normal'
      )) {
        statut = 'Normal';
      }

      return {
        id: e._id,
        patient: patient ? (patient.fullName || `${patient.prenom} ${patient.nom}`) : 'Inconnu',
        age: age,
        date: e.createdAt ? new Date(e.createdAt).toLocaleDateString('fr-FR') : '--',
        statut: statut,
        type: 'Repos 12 pistes', // default
        urgent: e.urgent || false
      };
    });

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getDoctorDistributionChart = async (req: Request, res: Response) => {
  try {
    const doctorId = (req as any).user._id;

    // 1. Trouver les ECGs de ce médecin
    const ecgs = await ECG.find({ doctor: doctorId }).select('_id');
    const ecgIds = ecgs.map(e => e._id);

    // 2. Trouver toutes les analyses terminées
    const analyses = await ECGAnalysis.find({
      ecg: { $in: ecgIds },
      status: 'analyzed'
    });

    // Map des abréviations vers noms complets en français
    const mapping: Record<string, string> = {
      'NSR': 'Normal',
      'SB': 'Bradycardie',
      'RBBB': 'Bloc Branche Droit',
      'RVH': 'Hypertrophie V. D.',
      'MI': 'Infarctus (MI)',
      'TWI': 'Inversion Onde T',
      'STD': 'Sous-décalage ST',
      'AF': 'Fibrillation Atriale',
      'AFL': 'Flutter Atrial',
      'LAFB': 'Hémibloc Ant. Gauche'
    };

    const counts: Record<string, number> = {};

    analyses.forEach(a => {
      const anomalies = a.aiResult?.ai_classification?.anomalies;
      const mainStatus = a.aiResult?.ai_classification?.status;

      if (Array.isArray(anomalies) && anomalies.length > 0) {
        anomalies.forEach((code: string) => {
          const fullName = mapping[code] || code;
          counts[fullName] = (counts[fullName] || 0) + 1;
        });
      } else if (mainStatus === 'Normal' || mainStatus === 'NSR') {
        counts['Normal'] = (counts['Normal'] || 0) + 1;
      } else if (mainStatus) {
        counts[mainStatus] = (counts[mainStatus] || 0) + 1;
      }
    });

    // Calculer le total des détections pour les pourcentages
    const totalDetections = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

    // Trier pour n'envoyer que les plus fréquents si besoin, ou tout
    const labels = Object.keys(counts);
    const values = labels.map(l => Math.round((counts[l] / totalDetections) * 100));

    res.json({ labels, values });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getDoctorReceivedECGs = async (req: Request, res: Response) => {
  try {
    const doctorId = (req as any).user._id;
    const ecgs = await ECG.find({ doctor: doctorId })
      .sort({ createdAt: -1 })
      .populate('patient', 'fullName prenom nom dateOfBirth phone gender');

    res.json(ecgs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};