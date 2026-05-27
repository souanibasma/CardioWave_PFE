import mongoose, { Document, Schema } from "mongoose";

export interface IECGAnalysis extends Document {
  ecg: mongoose.Types.ObjectId;
  plotImage?: string;
  plot12leads?: string;
  plotFullLeadII?: string;
  npyFile?: string;
  aiResult?: any;
  doctorNotes?: string;
  reportUrl?: string;
  status: 'uploaded' | 'digitized' | 'analyzed';
  createdAt: Date;
  updatedAt: Date;
}

const ecgAnalysisSchema = new Schema<IECGAnalysis>(
  {
    ecg: {
      type: Schema.Types.ObjectId,
      ref: "ECG",
      required: true,
    },
    plotImage: {
      type: String,
      default: "",
    },
    plot12leads: {
      type: String,
      default: "",
    },
    plotFullLeadII: {
      type: String,
      default: "",
    },
    npyFile: {
      type: String,
      default: "",
    },
    aiResult: {
      type: Schema.Types.Mixed,
      default: null,
    },
    doctorNotes: {
      type: String,
      default: "",
    },
    reportUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ['uploaded', 'digitized', 'analyzed'],
      default: 'uploaded',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IECGAnalysis>("ECGAnalysis", ecgAnalysisSchema);