import mongoose from "mongoose";
import Notification from "../models/Notification";

interface CreateNotificationInput {
  type: "verification" | "inscription" | "ecg" | "systeme";
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
  relatedUser?: string;
}

export const createAdminNotification = async ({
  type,
  title,
  description,
  actionLabel,
  actionPath,
  relatedUser,
}: CreateNotificationInput) => {
  await Notification.create({
    recipientRole: "admin",
    type,
    title,
    description,
    isRead: false,
    actionLabel: actionLabel || "",
    actionPath: actionPath || "",
    relatedUser: relatedUser
      ? new mongoose.Types.ObjectId(relatedUser)
      : undefined,
  });
};