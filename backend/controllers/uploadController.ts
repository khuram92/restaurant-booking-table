import type { Response } from "express";
import cloudinary from "../config/cloudinary.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";

type UploadConfig = {
  roles: string[];
  params: (userId: string) => Record<string, string | number | boolean>;
};

// Part of the signature, so Cloudinary rejects any other file type.
const ALLOWED_FORMATS = "jpg,jpeg,png,webp";

const UPLOAD_TYPES = new Map<string, UploadConfig>([
  [
    "restaurants",
    {
      roles: ["restaurant", "admin"],
      params: () => ({
        folder: "tablebooking/restaurants",
        allowed_formats: ALLOWED_FORMATS,
      }),
    },
  ],
  [
    "profiles",
    {
      roles: ["customer", "restaurant", "admin"],
      params: (userId) => ({
        public_id: `tablebooking/profiles/${userId}`,
        overwrite: true,
        invalidate: true, // refresh the CDN copy when a user replaces their photo
        allowed_formats: ALLOWED_FORMATS,
      }),
    },
  ],
]);

export const getUploadSignature = (req: AuthRequest, res: Response) => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return res.status(500).json({ message: "Image uploads are not configured" });
  }

  const config = UPLOAD_TYPES.get(String(req.body?.type));
  if (!config) {
    return res.status(400).json({ message: "Invalid upload type" });
  }
  if (!req.userId || !req.role || !config.roles.includes(req.role)) {
    return res
      .status(403)
      .json({ message: "You can't upload this kind of image" });
  }

  const params = {
    ...config.params(req.userId),
    timestamp: Math.round(Date.now() / 1000),
  };

  // Cloudinary only accepts an upload whose parameters match this signature
  const signature = cloudinary.utils.api_sign_request(
    params,
    CLOUDINARY_API_SECRET,
  );

  return res.status(200).json({
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    signature,
    params,
  });
};