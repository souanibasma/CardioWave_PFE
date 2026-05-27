import express from "express";
import {
  getAdminNotifications,
  getDoctorNotifications,
  markNotificationAsRead,
  markAllDoctorNotificationsAsRead,
  getUnreadCount,
} from "../controllers/notificationController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.use(protect);

// Routes for both
router.get("/unread-count", getUnreadCount);
router.patch("/:id/read", markNotificationAsRead);

// Doctor specific
router.get("/doctor", getDoctorNotifications);
router.patch("/doctor/read-all", markAllDoctorNotificationsAsRead);

// Admin specific (can be handled here or kept separate)
router.get("/admin", getAdminNotifications);

export default router; 