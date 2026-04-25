import multer from "multer";
import {
  createDiskStorage,
  createMimeAndExtensionFileFilter,
} from "../shared/local-upload.service";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-matroska",
  "video/avi",
  "video/x-msvideo",
]);

const allowedExtensions = new Set([
  ".pdf",
  ".png", ".jpg", ".jpeg", ".webp", ".gif",
  ".doc", ".docx",
  ".mp4", ".webm", ".ogg", ".ogv", ".mov", ".mkv", ".avi",
]);

const upload = multer({
  storage: createDiskStorage("others", "annonces"),
  limits: {
    fileSize: 200 * 1024 * 1024,
    files: 1,
  },
  fileFilter: createMimeAndExtensionFileFilter(
    allowedMimeTypes,
    allowedExtensions,
    "Only JPG, PNG, GIF, PDF, Word, and video files (MP4, WebM, MOV) are allowed"
  ),
});

export default upload;
