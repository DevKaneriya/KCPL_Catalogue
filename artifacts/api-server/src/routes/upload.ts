import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

router.post("/upload", upload.single("image"), (req, res): any => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided." });
  }

  // File is saved in 'uploads/'
  // We'll serve it publicly as '/uploads/filename.ext'
  const imageUrl = `/uploads/${req.file.filename}`;
  return res.status(200).json({ url: imageUrl });
});

export default router;
