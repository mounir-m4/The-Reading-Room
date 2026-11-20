import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { cloudinary, cloudinaryEnabled } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { badRequest } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const allowed = /jpeg|jpg|png|webp|avif/;
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter(_req, file, cb) {
    if (!allowed.test(path.extname(file.originalname).toLowerCase())) {
      return cb(badRequest('Only JPEG, PNG, WEBP and AVIF images are allowed'));
    }
    cb(null, true);
  },
});

async function storeFile(file, folder) {
  if (cloudinaryEnabled) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `the-reading-room/${folder}`, resource_type: 'image' },
        (error, data) => (error ? reject(error) : resolve(data)),
      );
      stream.end(file.buffer);
    });
    return { url: result.secure_url, publicId: result.public_id };
  }

  if (env.isServerless) {
    throw badRequest('Configure Cloudinary to upload images in serverless hosting');
  }

  const dir = path.resolve(process.cwd(), 'uploads', folder);
  fs.mkdirSync(dir, { recursive: true });
  const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
  fs.writeFileSync(path.join(dir, name), file.buffer);
  return { url: `/uploads/${folder}/${name}`, publicId: null };
}

export { storeFile };

export const processImages = (folder = 'general') =>
  asyncHandler(async (req, res, next) => {
    const files = req.files?.length ? req.files : req.file ? [req.file] : [];
    if (!files.length) return next();
    req.uploadedFiles = [];
    for (const file of files) {
      req.uploadedFiles.push(await storeFile(file, folder));
    }
    next();
  });

export async function removeImage(publicId) {
  if (cloudinaryEnabled && publicId) await cloudinary.uploader.destroy(publicId);
}
