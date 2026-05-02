const express = require("express");
const multer = require("multer");
const { uploadToS3 } = require("./s3");

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG/PNG allowed"));
    }
  },
});

router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Resize before upload to save bandwidth/storage
    const url = await uploadToS3(req.file, { resize: true });

    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// Presigned URL endpoint: client can request a PUT URL to upload directly to S3
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

router.post("/signed-url", async (req, res) => {
  try {
    const { filename, contentType, expires = 900 } = req.body || {};
    if (!filename || !contentType) {
      return res.status(400).json({ error: "filename and contentType required" });
    }

    const Key = `${Date.now()}-${uuidv4()}${require('path').extname(filename)}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: parseInt(expires, 10) });

    res.json({ url, key: Key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Thumbnail endpoint: uploads original and thumbnail, returns both URLs
router.post("/thumbnail", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Upload original
    const originalUrl = await uploadToS3(req.file, { resize: false });

    // Create thumbnail
    const thumbBuffer = await sharp(req.file.buffer)
      .resize({ width: 200, withoutEnlargement: true })
      .toBuffer();

    const thumbFile = {
      originalname: `thumb-${req.file.originalname}`,
      buffer: thumbBuffer,
      mimetype: req.file.mimetype,
    };

    const thumbUrl = await uploadToS3(thumbFile, { resize: false });

    res.json({ original: originalUrl, thumbnail: thumbUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
