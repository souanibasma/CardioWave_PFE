import mongoose, { Document, Schema, Types } from "mongoose";

export interface INotification extends Document {
  recipientRole: "admin" | "doctor";
  recipientId?: Types.ObjectId; // Targeted user (especially for doctors)
  type: "verification" | "inscription" | "ecg" | "systeme" | "ecg_received" | "digitization_completed" | "analysis_completed";
  title: string;
  description: string;
  isRead: boolean;
  actionLabel?: string;
  actionPath?: string;
  relatedUser?: Types.ObjectId;
  relatedEcg?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientRole: {
      type: String,
      enum: ["admin", "doctor"],
      required: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
    },
    type: {
      type: String,
      enum: ["verification", "inscription", "ecg", "systeme", "ecg_received", "digitization_completed", "analysis_completed"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    actionLabel: {
      type: String,
      default: "",
    },
    actionPath: {
      type: String,
      default: "",
    },
    relatedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
    },
    relatedEcg: {
      type: Schema.Types.ObjectId,
      ref: "ECG",
      default: undefined,
    },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>("Notification", notificationSchema);