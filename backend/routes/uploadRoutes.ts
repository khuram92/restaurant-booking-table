import { Router } from "express";
import { getUploadSignature } from "../controllers/uploadController.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadLimiter } from "../middleware/limiterMiddleware.js";

const router = Router();

// Any logged-in user can sign a profile-photo upload; "restaurants" uploads are
// limited to restaurant owners and admins inside the controller (UPLOAD_TYPES).
router.post("/sign", protect, uploadLimiter, getUploadSignature);

export default router;