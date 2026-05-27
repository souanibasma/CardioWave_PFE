import mongoose, { Document, Schema, Types } from "mongoose";

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  role: "admin" | "doctor" | "patient";
  isApproved: boolean;
  isEmailVerified: boolean;
  verificationToken?: string;
  verificationExpires?: Date;
  googleId?: string;

  // Patient fields
  phone?: string;
  dateOfBirth?: Date;
  gender?: "male" | "female";
  assignedDoctor?: Types.ObjectId | null;
  isTemporary?: boolean;
  mustChangePassword?: boolean;

  // Doctor fields
  specialty?: string;
  licenseNumber?: string;
  hospitalOrClinic?: string;

  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["admin", "doctor", "patient"],
      required: true,
      default: "patient",
    },

    isApproved: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },
    verificationExpires: {
      type: Date,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Patient fields
    phone: {
      type: String,
      default: "",
      trim: true,
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    gender: {
      type: String,
      enum: ["male", "female"],
      default: undefined,
    },

    assignedDoctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isTemporary: {
      type: Boolean,
      default: false,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },

    // Doctor fields
    specialty: {
      type: String,
      default: "",
      trim: true,
    },

    licenseNumber: {
      type: String,
      default: "",
      trim: true,
    },

    hospitalOrClinic: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;