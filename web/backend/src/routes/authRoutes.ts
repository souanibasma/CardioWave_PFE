import express from "express";
import { 
  registerUser, 
  loginUser, 
  verifyEmail, 
  resendVerificationEmail, 
  googleAuth, 
  completeProfile 
} from "../controllers/authController";
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.post("/google", googleAuth);
router.post("/complete-profile", completeProfile);


export default router;