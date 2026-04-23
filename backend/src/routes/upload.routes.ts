import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth.middleware";
import { uploadProfilePhoto } from "../controllers/upload.controller";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }

    cb(new Error("Only image files are allowed"));
  },
});

router.post(
  "/profile-photo",
  authenticate,
  upload.single("photo"),
  uploadProfilePhoto,
);

export default router;
