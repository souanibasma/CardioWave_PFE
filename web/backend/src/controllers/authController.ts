import { Request, Response } from "express";
import User from "../models/User";
import ApprovedLicense from "../models/ApprovedLicense";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import generateToken from "../utils/generateToken";
import { createAdminNotification } from "../utils/createNotification";
import { sendVerificationEmail } from "../services/emailService";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      fullName,
      email,
      password,
      role,

      // patient
      phone,
      dateOfBirth,
      gender,

      // doctor
      specialty,
      licenseNumber,
      hospitalOrClinic,
    } = req.body;

    if (role === "admin") {
      res.status(403).json({
        message: "Admin cannot register via this route",
      });
      return;
    }

    if (!fullName || !email || !password || !role) {
      res.status(400).json({
        message: "Missing required fields",
      });
      return;
    }

    if (role !== "doctor" && role !== "patient") {
      res.status(400).json({
        message: "Invalid role",
      });
      return;
    }

    if (role === "doctor") {
      if (!specialty || !licenseNumber || !hospitalOrClinic) {
        res.status(400).json({
          message:
            "Doctor must provide specialty, licenseNumber and hospitalOrClinic",
        });
        return;
      }
    }

    if (role === "patient") {
      if (!phone || !dateOfBirth) {
        res.status(400).json({
          message: "Patient must provide phone and dateOfBirth",
        });
        return;
      }
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(400).json({
        message: "User already exists",
      });
      return;
    }

    // ── Auto-approval logic for doctors ──
    let isApproved = role === "patient"; // patients always approved
    if (role === "doctor") {
      const approved = await ApprovedLicense.findOne({
        licenseNumber: licenseNumber.trim().toUpperCase(),
      });
      isApproved = !!approved;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationToken = crypto.randomBytes(20).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      role,
      isApproved,
      isEmailVerified: false,
      verificationToken,
      verificationExpires,

      phone: role === "patient" ? phone : undefined,
      dateOfBirth: role === "patient" ? dateOfBirth : undefined,
      gender: role === "patient" ? gender || undefined : undefined,

      specialty: role === "doctor" ? specialty : undefined,
      licenseNumber: role === "doctor" ? licenseNumber : undefined,
      hospitalOrClinic: role === "doctor" ? hospitalOrClinic : undefined,
    });

    try {
      await sendVerificationEmail({
        to: newUser.email,
        name: newUser.fullName,
        token: verificationToken,
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // We don't fail the registration if email fails
    }

    // Notifications admin
    if (role === "doctor") {
      if (isApproved) {
        await createAdminNotification({
          type: "verification",
          title: "Médecin auto-approuvé",
          description: `${newUser.fullName} a été automatiquement approuvé (licence ${licenseNumber} vérifiée).`,
          relatedUser: String(newUser._id),
        });
      } else {
        await createAdminNotification({
          type: "verification",
          title: "Nouvelle demande de vérification",
          description: `${newUser.fullName} a soumis une demande de vérification médecin (licence ${licenseNumber} non reconnue).`,
          actionLabel: "Vérifier",
          actionPath: "/admin/verification",
          relatedUser: String(newUser._id),
        });
      }
    }

    if (role === "patient") {
      await createAdminNotification({
        type: "inscription",
        title: "Nouveau patient inscrit",
        description: `${newUser.fullName} vient de créer un compte patient sur CardioWave.`,
        relatedUser: String(newUser._id),
      });
    }

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        isApproved: newUser.isApproved,
      },
    });
  } catch (error) {
    console.error("registerUser error:", error);
    res.status(500).json({
      message: "Server error during registration",
    });
  }
};

export const loginUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        message: "Email and password are required",
      });
      return;
    }

    const user = await User.findOne({ email });

    if (!user) {
      res.status(400).json({
        message: "Invalid credentials",
      });
      return;
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      res.status(400).json({
        message: "Invalid credentials",
      });
      return;
    }

    if (!user.isEmailVerified) {
      res.status(403).json({
        requiresVerification: true,
        message: "Veuillez vérifier votre adresse email avant de vous connecter.",
      });
      return;
    }

    // ── Doctor pending approval — return user info without token ──
    if (user.role === "doctor" && !user.isApproved) {
      res.status(200).json({
        requiresApproval: true,
        message: "Votre compte médecin est en attente de validation par l'administrateur.",
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
        },
      });
      return;
    }

    const token = generateToken(String(user._id), user.role);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        specialty: user.specialty,
        hospitalOrClinic: user.hospitalOrClinic,
      },
    });
  } catch (error) {
    console.error("loginUser error:", error);
    res.status(500).json({
      message: "Server error during login",
    });
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ message: "Token is required" });
      return;
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({ message: "Lien de vérification invalide ou expiré." });
      return;
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();
    
    // Check doctor approval
    if (user.role === "doctor" && !user.isApproved) {
      res.status(200).json({
        message: "Email vérifié. Votre compte est en attente de validation par l'administrateur.",
        requiresApproval: true,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
        }
      });
      return;
    }

    // Login automatically
    const loginToken = generateToken(String(user._id), user.role);

    res.status(200).json({ 
      message: "Email vérifié avec succès.",
      token: loginToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        specialty: user.specialty,
        hospitalOrClinic: user.hospitalOrClinic,
      }
    });
  } catch (error) {
    console.error("verifyEmail error:", error);
    res.status(500).json({ message: "Server error during email verification" });
  }
};

export const resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    const user = await User.findOne({ email });

    if (!user) {
      res.status(400).json({ message: "Utilisateur non trouvé" });
      return;
    }

    if (user.isEmailVerified) {
      res.status(400).json({ message: "Cet email est déjà vérifié" });
      return;
    }

    const verificationToken = crypto.randomBytes(20).toString("hex");
    user.verificationToken = verificationToken;
    user.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    await sendVerificationEmail({
      to: user.email,
      name: user.fullName,
      token: verificationToken,
    });

    res.status(200).json({ message: "Email de vérification renvoyé." });
  } catch (error) {
    console.error("resendVerificationEmail error:", error);
    res.status(500).json({ message: "Server error during resending email" });
  }
};

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken, role } = req.body; // role is passed during registration

    if (!idToken) {
      res.status(400).json({ message: "Google ID Token is required" });
      return;
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ message: "Invalid Google Token" });
      return;
    }

    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      // User doesn't exist, create them
      const assignedRole = role || "patient";
      
      user = await User.create({
        fullName: name,
        email,
        password: crypto.randomBytes(16).toString("hex"), // Random password
        role: assignedRole,
        isApproved: assignedRole === "patient",
        isEmailVerified: true, // Google emails are already verified
        googleId,
        // Missing fields like phone, DOB, specialty, license will need to be filled later
      });

      if (assignedRole === "patient") {
        await createAdminNotification({
          type: "inscription",
          title: "Nouveau patient inscrit (Google)",
          description: `${user.fullName} vient de créer un compte avec Google.`,
          relatedUser: String(user._id),
        });
      }
    } else {
      // User exists, just update their googleId if missing
      if (!user.googleId) {
        user.googleId = googleId;
        user.isEmailVerified = true;
        await user.save();
      }
    }

    // Doctor profile completion check
    let requiresProfileCompletion = false;
    if (user.role === "doctor" && (!user.specialty || !user.licenseNumber)) {
      requiresProfileCompletion = true;
      res.status(200).json({
        requiresProfileCompletion,
        user: { id: user._id, email: user.email, role: user.role }
      });
      return;
    }

    // Check doctor approval
    if (user.role === "doctor" && !user.isApproved) {
      res.status(200).json({
        requiresApproval: true,
        message: "Votre compte médecin est en attente de validation par l'administrateur.",
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
        },
      });
      return;
    }

    const token = generateToken(String(user._id), user.role);

    res.status(200).json({
      message: "Login successful",
      token,
      requiresProfileCompletion: false,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        specialty: user.specialty,
        hospitalOrClinic: user.hospitalOrClinic,
      },
    });
  } catch (error) {
    console.error("googleAuth error:", error);
    res.status(500).json({ message: "Server error during Google Authentication" });
  }
};

export const completeProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, specialty, licenseNumber, hospitalOrClinic } = req.body;
    
    if (!userId || !specialty || !licenseNumber) {
      res.status(400).json({ message: "La spécialité et le numéro de licence sont requis." });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "Utilisateur non trouvé." });
      return;
    }

    if (user.role !== "doctor") {
      res.status(400).json({ message: "Seuls les médecins peuvent compléter leur profil de cette manière." });
      return;
    }

    const existingLicense = await User.findOne({ licenseNumber: licenseNumber.trim(), _id: { $ne: user._id } });
    if (existingLicense) {
       res.status(400).json({ message: "Ce numéro de licence est déjà utilisé." });
       return;
    }

    user.specialty = specialty;
    user.licenseNumber = licenseNumber;
    user.hospitalOrClinic = hospitalOrClinic;

    // Check approval
    const approved = await ApprovedLicense.findOne({
      licenseNumber: licenseNumber.trim().toUpperCase(),
    });
    user.isApproved = !!approved;

    await user.save();

    if (user.isApproved) {
      await createAdminNotification({
        type: "verification",
        title: "Médecin auto-approuvé (Google)",
        description: `${user.fullName} a été automatiquement approuvé (licence ${licenseNumber} vérifiée).`,
        relatedUser: String(user._id),
      });
    } else {
      await createAdminNotification({
        type: "verification",
        title: "Nouvelle demande de vérification (Google)",
        description: `${user.fullName} a soumis une demande de vérification médecin (licence ${licenseNumber} non reconnue).`,
        actionLabel: "Vérifier",
        actionPath: "/admin/verification",
        relatedUser: String(user._id),
      });
    }

    if (!user.isApproved) {
        res.status(200).json({
            message: "Profile completed. Pending approval.",
            requiresApproval: true,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                isApproved: user.isApproved,
            }
        });
        return;
    }

    const token = generateToken(String(user._id), user.role);

    res.status(200).json({
      message: "Profile completed",
      requiresApproval: false,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
      }
    });

  } catch (error) {
    console.error("completeProfile error:", error);
    res.status(500).json({ message: "Server error during profile completion." });
  }
};