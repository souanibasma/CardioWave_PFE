import { Request, Response } from "express";
import Ecg from "../models/ECG";

interface AuthRequest extends Request {
  user?: {
    _id: string;
    role: string;
    email?: string;
  };
}

type Severity = "high" | "medium" | "low";
type EcgStatus = "Anormal" | "Normal" | "En attente" | "pending";

interface DoctorPatientEcgItem {
  id: string;
  date: string;
  statut: EcgStatus;
  type: string;
  fichier: string;
  fileUrl: string;
}

interface DoctorPatientItem {
  id: string;
  nom: string;
  prenom: string;
  age: number;
  email: string;
  telephone: string;
  derniereActivite: string;
  nombreEcg: number;
  statutDernier: EcgStatus;
  severity: Severity;
  ecgs: DoctorPatientEcgItem[];
}

const splitFullName = (fullName: string): { prenom: string; nom: string } => {
  const clean = (fullName || "").trim();
  if (!clean) return { prenom: "Patient", nom: "" };

  const parts = clean.split(/\s+/);
  return {
    prenom: parts[0] || "Patient",
    nom: parts.slice(1).join(" ") || "",
  };
};

const calculateAge = (dateOfBirth?: string | Date | null): number => {
  if (!dateOfBirth) return 0;

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();

  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age >= 0 ? age : 0;
};

const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatShortDate = (date: Date): string => {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const computeSeverity = (
  statutDernier: EcgStatus,
  nombreEcg: number
): Severity => {
  if (statutDernier === "Anormal" && nombreEcg >= 5) return "high";
  if (statutDernier === "Anormal") return "medium";
  return "low";
};

export const getDoctorPatients = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const doctorId = req.user?._id;

    if (!doctorId) {
      res.status(401).json({ message: "Non autorisé." });
      return;
    }

    // ✅ Utiliser le champ unifié "doctor" au lieu de "doctorId"
    const ecgs = (await Ecg.find({ doctor: doctorId })
      .populate("patient", "fullName email phone dateOfBirth")
      .sort({ createdAt: -1 })
      .lean()) as any[];

    const patientsMap = new Map<string, DoctorPatientItem>();

    for (const ecg of ecgs) {
      // ✅ Utiliser le champ unifié "patient" au lieu de "patientId"
      const patient = ecg.patient as any;

      if (!patient || !patient._id) continue;

      const patientId = String(patient._id);

      if (!patientsMap.has(patientId)) {
        const { prenom, nom } = splitFullName(patient.fullName);

        patientsMap.set(patientId, {
          id: patientId,
          nom,
          prenom,
          age: calculateAge(patient.dateOfBirth),
          email: patient.email || "",
          telephone: patient.phone || "",
          derniereActivite: formatShortDate(new Date(ecg.createdAt)),
          nombreEcg: 0,
          statutDernier: ecg.status || "En attente",
          severity: "low",
          ecgs: [],
        });
      }

      const currentPatient = patientsMap.get(patientId)!;

      currentPatient.nombreEcg += 1;

      currentPatient.ecgs.push({
        id: String(ecg._id),
        date: formatDateTime(new Date(ecg.createdAt)),
        statut: ecg.status || "En attente",
        type: ecg.diagnosis || ecg.title || "Non précisé",
        fichier: ecg.originalFileName || ecg.title || "ECG",
        // ✅ Utiliser le champ unifié "originalImage" au lieu de "fileUrl"
        fileUrl: ecg.originalImage || "",
      });
    }

    const patients = Array.from(patientsMap.values()).map((patient) => ({
      ...patient,
      severity: computeSeverity(patient.statutDernier, patient.nombreEcg),
    }));

    res.status(200).json({
      success: true,
      count: patients.length,
      abnormalCount: patients.filter((p) => p.statutDernier === "Anormal")
        .length,
      patients,
    });
  } catch (error) {
    console.error("getDoctorPatients error:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getDoctorPatientById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const doctorId = req.user?._id;
    const { patientId } = req.params;

    if (!doctorId) {
      res.status(401).json({ message: "Non autorisé." });
      return;
    }

    // ✅ Utiliser les champs unifiés "doctor" et "patient"
    const ecgs = (await Ecg.find({
      doctor: doctorId,
      patient: patientId,
    })
      .populate("patient", "fullName email phone dateOfBirth")
      .sort({ createdAt: -1 })
      .lean()) as any[];

    if (!ecgs.length) {
      res.status(404).json({ message: "Aucun ECG trouvé pour ce patient." });
      return;
    }

    // ✅ Utiliser le champ unifié "patient"
    const patient = ecgs[0].patient as any;
    const { prenom, nom } = splitFullName(patient.fullName);

    const responsePatient: DoctorPatientItem = {
      id: String(patient._id),
      nom,
      prenom,
      age: calculateAge(patient.dateOfBirth),
      email: patient.email || "",
      telephone: patient.phone || "",
      derniereActivite: formatShortDate(new Date(ecgs[0].createdAt)),
      nombreEcg: ecgs.length,
      statutDernier: ecgs[0].status || "En attente",
      severity: computeSeverity(ecgs[0].status || "En attente", ecgs.length),
      ecgs: ecgs.map((ecg) => ({
        id: String(ecg._id),
        date: formatDateTime(new Date(ecg.createdAt)),
        statut: ecg.status || "En attente",
        type: ecg.diagnosis || ecg.title || "Non précisé",
        fichier: ecg.originalFileName || ecg.title || "ECG",
        // ✅ Utiliser le champ unifié "originalImage"
        fileUrl: ecg.originalImage || "",
      })),
    };

    res.status(200).json({
      success: true,
      patient: responsePatient,
    });
  } catch (error) {
    console.error("getDoctorPatientById error:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};