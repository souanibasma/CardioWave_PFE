import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";

interface AuthRequest extends Request {
  user?: any;
}

// GET /api/admin/users
export const getAllUsers = async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des utilisateurs" });
  }
};

// GET /api/admin/users/:id
export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de l'utilisateur" });
  }
};

// POST /api/admin/users
export const createUserByAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const {
      fullName,
      email,
      password,
      role,
      phone,
      dateOfBirth,
      gender,
      specialty,
      licenseNumber,
      hospitalOrClinic,
      isApproved,
    } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: "fullName, email, password et role sont obligatoires" });
    }

    if (!["admin", "doctor", "patient"].includes(role)) {
      return res.status(400).json({ message: "Rôle invalide" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Cet email existe déjà" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData: any = {
      fullName,
      email,
      password: hashedPassword,
      role,
      isApproved: role === "patient" ? true : role === "doctor" ? !!isApproved : true,
    };

    if (role === "patient") {
      userData.phone = phone || "";
      userData.dateOfBirth = dateOfBirth || "";
      userData.gender = gender || "";
    }

    if (role === "doctor") {
      userData.specialty = specialty || "";
      userData.licenseNumber = licenseNumber || "";
      userData.hospitalOrClinic = hospitalOrClinic || "";
    }

    const createdUser = await User.create(userData);

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      user: {
        ...createdUser.toObject(),
        password: undefined,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création de l'utilisateur" });
  }
};

// PUT /api/admin/users/:id
export const updateUserByAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const {
      fullName,
      email,
      password,
      role,
      phone,
      dateOfBirth,
      gender,
      specialty,
      licenseNumber,
      hospitalOrClinic,
      isApproved,
    } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: "Cet email est déjà utilisé" });
      }
      user.email = email;
    }

    if (fullName) user.fullName = fullName;
    if (role && ["admin", "doctor", "patient"].includes(role)) user.role = role as any;

    if (typeof isApproved === "boolean") {
      user.isApproved = isApproved;
    }

    if (password && password.trim() !== "") {
      user.password = await bcrypt.hash(password, 10);
    }

    // Champs patient
    user.phone = phone ?? user.phone;
    user.dateOfBirth = dateOfBirth ?? user.dateOfBirth;
    user.gender = gender ?? user.gender;

    // Champs doctor
    user.specialty = specialty ?? user.specialty;
    user.licenseNumber = licenseNumber ?? user.licenseNumber;
    user.hospitalOrClinic = hospitalOrClinic ?? user.hospitalOrClinic;

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");

    res.status(200).json({
      message: "Utilisateur modifié avec succès",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la modification de l'utilisateur" });
  }
};

// DELETE /api/admin/users/:id
export const deleteUserByAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    await user.deleteOne();

    res.status(200).json({ message: "Utilisateur supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression de l'utilisateur" });
  }
};

// GET /api/admin/pending-doctors
export const getPendingDoctors = async (_req: AuthRequest, res: Response) => {
  try {
    const pendingDoctors = await User.find({
      role: "doctor",
      isApproved: false,
    }).select("-password");

    res.status(200).json(pendingDoctors);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des doctors en attente" });
  }
};

// PUT /api/admin/approve-doctor/:id
export const approveDoctor = async (req: AuthRequest, res: Response) => {
  try {
    const doctor = await User.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ message: "Doctor introuvable" });
    }

    if (doctor.role !== "doctor") {
      return res.status(400).json({ message: "Cet utilisateur n'est pas un doctor" });
    }

    doctor.isApproved = true;
    await doctor.save();

    res.status(200).json({ message: "Doctor approuvé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'approbation du doctor" });
  }
};

import ECG from "../models/ECG";

export const getDashboardStats = async (_req: AuthRequest, res: Response) => {
  try {
    const activeDoctors = await User.countDocuments({
      role: "doctor",
      isApproved: true,
    });

    const patientsCount = await User.countDocuments({
      role: "patient",
    });

    const ecgCount = await ECG.countDocuments();

    const pendingDoctors = await User.countDocuments({
      role: "doctor",
      isApproved: false,
    });

    res.status(200).json({
      activeDoctors,
      patientsCount,
      ecgCount,
      pendingDoctors,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des statistiques admin" });
  }
};

export const getRecentDoctors = async (_req: AuthRequest, res: Response) => {
  try {
    const doctors = await User.find({ role: "doctor" })
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(5);

    const formatted = doctors.map((doc) => ({
      _id: doc._id,
      nom: doc.fullName,
      specialite: doc.specialty || "Non renseignée",
      date: doc.createdAt,
      statut: doc.isApproved ? "Vérifié" : "En attente",
    }));

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des médecins récents" });
  }
};

export const rejectDoctor = async (req: AuthRequest, res: Response) => {
  try {
    const doctor = await User.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ message: "Doctor introuvable" });
    }

    if (doctor.role !== "doctor") {
      return res.status(400).json({ message: "Cet utilisateur n'est pas un doctor" });
    }

    doctor.isApproved = false;
    await doctor.save();

    res.status(200).json({ message: "Doctor refusé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du refus du doctor" });
  }
};

export const getDashboardCharts = async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const months: { label: string; start: Date; end: Date }[] = [];

    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = start.toLocaleString("fr-FR", { month: "short" });
      months.push({ label, start, end });
    }

    const ecgParMois = await Promise.all(
      months.map(async (month) => {
        const ecg = await ECG.countDocuments({
          createdAt: { $gte: month.start, $lt: month.end },
        });

        return { mois: month.label, ecg };
      })
    );

    const inscriptionsParMois = await Promise.all(
      months.map(async (month) => {
        const medecins = await User.countDocuments({
          role: "doctor",
          createdAt: { $gte: month.start, $lt: month.end },
        });

        const patients = await User.countDocuments({
          role: "patient",
          createdAt: { $gte: month.start, $lt: month.end },
        });

        return { mois: month.label, medecins, patients };
      })
    );

    const specialitesAgg = await User.aggregate([
      {
        $match: {
          role: "doctor",
          isApproved: true,
          specialty: { $exists: true, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$specialty",
          value: { $sum: 1 },
        },
      },
      { $sort: { value: -1 } },
    ]);

    const specialites = specialitesAgg.map((item) => ({
      name: item._id,
      value: item.value,
    }));

    const analyzed = await ECG.countDocuments({ status: "analyzed" });
    const pending = await ECG.countDocuments({ status: "pending" });
    const urgent = await ECG.countDocuments({ status: "urgent" });

    const ecgStatuts = [
      { name: "Analysés", value: analyzed },
      { name: "En attente", value: pending },
      { name: "Urgents", value: urgent },
    ];

    res.status(200).json({
      ecgParMois,
      inscriptionsParMois,
      specialites,
      ecgStatuts,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des graphiques admin" });
  }
};