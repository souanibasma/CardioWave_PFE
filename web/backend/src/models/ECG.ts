import mongoose, { Schema, Types } from "mongoose";

export type EcgStatus = "Anormal" | "Normal" | "En attente" | "pending";

// ── Champs réels du schéma ──
export interface IECG {
  title: string;
  originalImage: string; // Chemin du fichier (source de vérité)
  patient?: mongoose.Types.ObjectId; // Patient (OPTIONNEL pour flux médecin direct)
  doctor?: mongoose.Types.ObjectId; // Médecin assigné (source de vérité)
  uploadedBy?: mongoose.Types.ObjectId;
  originalFileName?: string;
  diagnosis?: string;
  urgent?: boolean;
  status?: EcgStatus;
  result?: string;
  condition?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ── Alias virtuels (séparés car non présents dans le schéma Mongoose) ──
export interface IECGVirtuals {
  patientId?: Types.ObjectId;
  doctorId?: Types.ObjectId;
  fileUrl?: string;
}

const ecgSchema = new Schema<IECG>(
  {
    // ── Champs principaux (source de vérité) ──
    title: {
      type: String,
      required: true,
    },
    originalImage: {
      type: String,
      required: true,
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    
    // ── Métadonnées ──
    originalFileName: {
      type: String,
      default: "",
    },
    diagnosis: {
      type: String,
      default: "",
    },
    urgent: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Anormal", "Normal", "En attente", "pending"],
      default: "En attente",
    },
    result: {
      type: String,
      default: "",
    },
    condition: {
      type: String,
      default: "",
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ── Virtuals pour rétrocompatibilité ──
// Ces champs sont calculés automatiquement et pointent vers la source de vérité

ecgSchema.virtual("patientId").get(function() {
  return this.patient;
});

ecgSchema.virtual("doctorId").get(function() {
  return this.doctor;
});

ecgSchema.virtual("fileUrl").get(function() {
  return this.originalImage;
});

// ── Index pour performances ──
ecgSchema.index({ patient: 1, createdAt: -1 });
ecgSchema.index({ doctor: 1, createdAt: -1 });
ecgSchema.index({ status: 1 });

export default mongoose.model<IECG>("ECG", ecgSchema);