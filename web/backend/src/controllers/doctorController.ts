import { Request, Response } from "express";
import User from "../models/User";
import bcrypt from "bcryptjs";
import ECG from "../models/ECG"; // adapte le chemin/nom selon ton projet

interface AuthRequest extends Request {
  user?: any;
}



// GET /api/doctor/profile
export const getDoctorProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const doctor = await User.findById(req.user._id).select("-password");

    if (!doctor) {
      res.status(404).json({ message: "Médecin introuvable" });
      return;
    }

    res.status(200).json(doctor);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération du profil médecin" });
  }
};

// PUT /api/doctor/profile
export const updateDoctorProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      fullName,
      email,
      phone,
      specialty,
      licenseNumber,
      hospitalOrClinic,
    } = req.body;

    const doctor = await User.findById(req.user._id);

    if (!doctor) {
      res.status(404).json({ message: "Médecin introuvable" });
      return;
    }

    if (email && email !== doctor.email) {
      const existingEmail = await User.findOne({ email });

      if (existingEmail) {
        res.status(400).json({ message: "Cet email est déjà utilisé" });
        return;
      }

      doctor.email = email;
    }

    if (fullName !== undefined) doctor.fullName = fullName;
    if (phone !== undefined) doctor.phone = phone;
    if (specialty !== undefined) doctor.specialty = specialty;
    if (licenseNumber !== undefined) doctor.licenseNumber = licenseNumber;
    if (hospitalOrClinic !== undefined) doctor.hospitalOrClinic = hospitalOrClinic;

    await doctor.save();

    const updatedDoctor = await User.findById(doctor._id).select("-password");

    res.status(200).json({
      message: "Profil médecin mis à jour avec succès",
      doctor: updatedDoctor,
    });
  } catch (error) {
    console.error("updateDoctorProfile error:", error);
    res.status(500).json({
      message: "Erreur lors de la mise à jour du profil médecin",
    });
  }
};
export const changeDoctorPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: "Les deux mots de passe sont requis" });
      return;
    }

    const doctor = await User.findById(req.user._id);

    if (!doctor) {
      res.status(404).json({ message: "Médecin introuvable" });
      return;
    }

    // Vérifier ancien mot de passe
    const isMatch = await bcrypt.compare(currentPassword, doctor.password);

    if (!isMatch) {
      res.status(400).json({ message: "Mot de passe actuel incorrect" });
      return;
    }

    // Hash nouveau mot de passe
    doctor.password = await bcrypt.hash(newPassword, 10);

    await doctor.save();

    res.status(200).json({ message: "Mot de passe mis à jour avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du changement de mot de passe" });
  }
};



// =========================
// DOCTOR DASHBOARD STATS
// =========================
export const getDoctorDashboardStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const doctorId = req.user._id;

    // nombre de patients assignés à ce médecin
    const totalPatients = await User.countDocuments({
      role: "patient",
      assignedDoctor: doctorId, // adapte si ton champ s'appelle autrement
    });

    // total analyses ECG liées au médecin
    const totalAnalyses = await ECG.countDocuments({
      doctor: doctorId,
    });

    // ECG anormaux
    const abnormalECGs = await ECG.countDocuments({
      doctor: doctorId,
      result: "Abnormal", // adapte selon ton schéma
    });

    // analyses de la semaine
    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeek = await ECG.countDocuments({
      doctor: doctorId,
      createdAt: { $gte: startOfWeek },
    });

    res.status(200).json({
      totalPatients,
      totalAnalyses,
      abnormalECGs,
      thisWeek,
    });
  } catch (error) {
    console.error("Erreur getDoctorDashboardStats:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// =========================
// WEEKLY ANALYSIS DATA
// =========================
export const getDoctorWeeklyAnalysis = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const doctorId = req.user._id;

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const result = [];

    const now = new Date();
    const currentDay = now.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const start = new Date(monday);
      start.setDate(monday.getDate() + i);

      const end = new Date(start);
      end.setDate(start.getDate() + 1);

      const analyses = await ECG.countDocuments({
        doctor: doctorId,
        createdAt: { $gte: start, $lt: end },
      });

      result.push({
        day: days[i],
        analyses,
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Erreur getDoctorWeeklyAnalysis:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// =========================
// RECENT PATIENTS
// =========================
export const getDoctorRecentPatients = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const doctorId = req.user._id;

    const patients = await User.find({
      role: "patient",
      assignedDoctor: doctorId,
    })
      .select("fullName dateOfBirth lastVisit riskLevel")
      .sort({ updatedAt: -1 })
      .limit(5);

    const formattedPatients = patients.map((patient: any) => {
      let age = null;
      if (patient.dateOfBirth) {
        const diff = Date.now() - new Date(patient.dateOfBirth).getTime();
        age = new Date(diff).getUTCFullYear() - 1970;
      }

      return {
        id: patient._id,
        name: patient.fullName,
        age,
        lastVisit: patient.lastVisit || patient.updatedAt,
        risk: patient.riskLevel || "Low",
      };
    });

    res.status(200).json(formattedPatients);
  } catch (error) {
    console.error("Erreur getDoctorRecentPatients:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// =========================
// RECENT ECG ANALYSES
// =========================
export const getDoctorRecentAnalyses = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const doctorId = req.user._id;

    const analyses = await ECG.find({ doctor: doctorId })
      .populate("patient", "fullName")
      .sort({ createdAt: -1 })
      .limit(5);

    const formattedAnalyses = analyses.map((item: any) => ({
      id: item._id,
      patient: item.patient?.fullName || "Patient inconnu",
      date: item.createdAt,
      result: item.result || "Review",
      condition: item.condition || "N/A",
    }));

    res.status(200).json(formattedAnalyses);
  } catch (error) {
    console.error("Erreur getDoctorRecentAnalyses:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// =========================
// PATIENT MANAGEMENT
// =========================

/**
 * GET /api/doctor/my-patients
 * Récupère la liste des patients avec leur dossier ECG complet
 */
export const getMyPatients = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doctorId = req.user._id;
    const User = require("../models/User").default;
    const ECG = require("../models/ECG").default;

    // 1. Trouver tous les patients du médecin
    const patients = await User.find({
      role: "patient",
      assignedDoctor: doctorId,
    }).select("_id fullName email phone dateOfBirth gender createdAt").lean();

    // 2. Pour chaque patient, récupérer ses ECGs et analyses
    const patientsWithHistory = await Promise.all(patients.map(async (patient: any) => {
      const ecgs = await ECG.find({ patient: patient._id })
        .sort({ createdAt: -1 })
        .lean();

      // Calcul de l'âge
      let age = null;
      if (patient.dateOfBirth) {
        const diff = Date.now() - new Date(patient.dateOfBirth).getTime();
        age = new Date(diff).getUTCFullYear() - 1970;
      }

      // Déterminer le niveau de risque global (basé sur le dernier ECG anormal)
      const hasUrgent = ecgs.some((e: any) => e.urgent === true);
      const hasAbnormal = ecgs.some((e: any) => e.result?.toLowerCase().includes("abnormal") || e.result?.toLowerCase().includes("anormal"));
      const riskLevel = hasUrgent ? "Critique" : (hasAbnormal ? "Anormal" : "Normal");

      return {
        id: patient._id,
        fullName: patient.fullName,
        email: patient.email,
        phone: patient.phone || "Non renseigné",
        age: age || "N/A",
        gender: patient.gender,
        riskLevel,
        ecgsCount: ecgs.length,
        lastActivity: ecgs.length > 0 ? ecgs[0].createdAt : patient.createdAt,
        ecgs: ecgs.map((e: any) => ({
          id: e._id,
          title: e.title || "ECG sans titre",
          date: e.createdAt,
          result: e.result || "En attente",
          condition: e.condition || "N/A",
          status: e.status,
          urgent: e.urgent
        }))
      };
    }));

    res.status(200).json(patientsWithHistory);
  } catch (error) {
    console.error("getMyPatients error:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des dossiers patients" });
  }
};

/**
 * POST /api/doctor/patients
 */
export const createPatient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fullName, email, dateOfBirth, gender, phone } = req.body;

    if (!fullName || !email) {
      res.status(400).json({ message: "fullName et email sont requis" });
      return;
    }

    // 1. Vérifier email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ message: "Cet email est déjà utilisé" });
      return;
    }

    // 2. Générer password temporaire
    const crypto = await import("crypto");
    const temporaryPassword = crypto.randomBytes(6).toString("hex");

    // 3. Hash
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // 4. Créer
    const newPatient = new User({
      fullName,
      email,
      dateOfBirth,
      gender,
      phone,
      role: "patient",
      password: hashedPassword,
      assignedDoctor: req.user._id,
      isTemporary: true,
      mustChangePassword: true,
      isApproved: true, // Approuvé d'office si créé par un médecin
    });

    await newPatient.save();

    // 5. Retourner (sans le hash)
    const patientObj = newPatient.toObject();
    delete (patientObj as any).password;

    res.status(201).json({
      patient: patientObj,
      temporaryPassword,
    });
  } catch (error) {
    console.error("createPatient error:", error);
    res.status(500).json({ message: "Erreur lors de la création du patient" });
  }
};

/**
 * GET /api/doctor/patients/:id
 * Récupère les détails complets d'un patient spécifique
 */
export const getPatientDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const doctorId = req.user._id;

    const patient = await User.findOne({
      _id: id,
      role: "patient",
      assignedDoctor: doctorId
    }).select("-password").lean();

    if (!patient) {
      res.status(404).json({ message: "Patient introuvable ou non assigné" });
      return;
    }

    const ecgs = await ECG.find({ patient: id })
      .sort({ createdAt: -1 })
      .lean();

    // Calcul de l'âge
    let age = null;
    if (patient.dateOfBirth) {
      const diff = Date.now() - new Date(patient.dateOfBirth).getTime();
      age = new Date(diff).getUTCFullYear() - 1970;
    }

    res.status(200).json({
      ...patient,
      age: age || "N/A",
      ecgs: ecgs.map((e: any) => ({
        id: e._id,
        title: e.title || "ECG sans titre",
        date: e.createdAt,
        result: e.result || "En attente",
        condition: e.condition || "N/A",
        status: e.status,
        urgent: e.urgent
      }))
    });
  } catch (error) {
    console.error("getPatientDetails error:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des détails du patient" });
  }
};