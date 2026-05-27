import Notification from "../models/Notification";
import { emitToUser } from "./socket";
import { Types } from "mongoose";

interface CreateNotificationParams {
  recipientRole: "admin" | "doctor";
  recipientId?: string | Types.ObjectId;
  type: "ecg_received" | "digitization_completed" | "analysis_completed" | "verification" | "inscription" | "ecg" | "systeme";
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
  relatedUser?: string | Types.ObjectId;
  relatedEcg?: string | Types.ObjectId;
}

export const createNotification = async (params: CreateNotificationParams) => {
  try {
    const notification = await Notification.create({
      ...params,
      isRead: false,
    });

    // If it's for a specific user, emit via socket
    if (params.recipientId) {
      emitToUser(params.recipientId.toString(), "new_notification", {
        _id: notification._id,
        type: notification.type,
        titre: notification.title,
        desc: notification.description,
        date: notification.createdAt,
        lue: notification.isRead,
        actionLabel: notification.actionLabel,
        actionPath: notification.actionPath,
        relatedEcg: notification.relatedEcg,
      });
    } else if (params.recipientRole === "admin") {
      // For admins, we might want to broadcast or emit to all admins
      // For now, let's assume we can emit to a "admin" room if we implement rooms
      // or just rely on them fetching it.
      // emitToRoom("admin", "new_notification", notification);
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};
