const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const sharp = require("sharp");
require("dotenv").config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const buildFileName = (originalName) => {
  const ext = path.extname(originalName) || "";
  return `${Date.now()}-${uuidv4()}${ext}`;
};

const uploadToS3 = async (file, options = { resize: false }) => {
  let body = file.buffer;

  if (options.resize) {
    // resize to max width 1024 while preserving aspect ratio
    body = await sharp(file.buffer)
      .resize({ width: 1024, withoutEnlargement: true })
      .toBuffer();
  }

  const fileName = buildFileName(file.originalname);

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: fileName,
    Body: body,
    ContentType: file.mimetype,
  };

  await s3.send(new PutObjectCommand(params));

  // Construct URL (best-effort). For most buckets:
  const region = process.env.AWS_REGION || "us-east-1";
  const bucket = process.env.S3_BUCKET;
  const url = region === "us-east-1"
    ? `https://${bucket}.s3.amazonaws.com/${fileName}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;

  return url;
};

module.exports = { uploadToS3 };