import { Router } from "express";
import { getUploadSignature } from "../controllers/uploadController.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadLimiter } from "../middleware/limiterMiddleware.js";

const router = Router();

router.post("/sign", protect, uploadLimiter, getUploadSignature);

export default router;