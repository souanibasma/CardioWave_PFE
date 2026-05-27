import { Response } from "express";
import Notification from "../models/Notification";
import { AuthRequest } from "../middleware/authMiddleware";

// GET /api/notifications/doctor
export const getDoctorNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Non authentifié" });
      return;
    }
    const userId = req.user._id;
    const userRole = req.user.role;
    const notifications = await Notification.find({
      recipientRole: userRole,
      recipientId: userId,
    }).sort({ createdAt: -1 });

    const formatted = notifications.map((n) => ({
      _id: n._id,
      type: n.type,
      titre: n.title,
      desc: n.description,
      date: n.createdAt,
      lue: n.isRead,
      actionLabel: n.actionLabel || undefined,
      actionPath: n.actionPath || undefined,
      relatedEcg: n.relatedEcg || undefined,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des notifications",
    });
  }
};

// PATCH /api/notifications/:id/read
export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const notif = await Notification.findById(req.params.id);

    if (!notif) {
      return res.status(404).json({
        message: "Notification introuvable",
      });
    }

    // Verify ownership for non-admins
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    if (notif.recipientRole !== "admin" && notif.recipientId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Action non autorisée" });
    }

    notif.isRead = true;
    await notif.save();

    res.status(200).json({
      message: "Notification marquée comme lue",
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la mise à jour de la notification",
    });
  }
};

// PATCH /api/notifications/read-all
export const markAllDoctorNotificationsAsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Non authentifié" });
      return;
    }
    const userId = req.user._id;
    const userRole = req.user.role;
    await Notification.updateMany(
      { recipientRole: userRole, recipientId: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      message: "Toutes les notifications ont été marquées comme lues",
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la mise à jour des notifications",
    });
  }
};

// GET /api/notifications/unread-count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Non authentifié" });
      return;
    }
    const query: any = { isRead: false };
    
    if (req.user.role === "admin") {
      query.recipientRole = "admin";
    } else {
      query.recipientRole = req.user.role;
      query.recipientId = req.user._id;
    }

    const count = await Notification.countDocuments(query);
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors du comptage des notifications non lues",
    });
  }
};

// GET /api/admin/notifications (Keep for backward compatibility or separate if needed)
export const getAdminNotifications = async (_req: AuthRequest, res: Response) => {
  try {
    const notifications = await Notification.find({ recipientRole: "admin" })
      .sort({ createdAt: -1 });

    const formatted = notifications.map((n) => ({
      _id: n._id,
      type: n.type,
      titre: n.title,
      desc: n.description,
      date: n.createdAt,
      lue: n.isRead,
      actionLabel: n.actionLabel || undefined,
      actionPath: n.actionPath || undefined,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des notifications",
    });
  }
};

// PATCH /api/admin/notifications/read-all
export const markAllAdminNotificationsAsRead = async (_req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany(
      { recipientRole: "admin", isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      message: "Toutes les notifications admin ont été marquées comme lues",
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la mise à jour des notifications",
    });
  }
};