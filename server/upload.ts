import multer from "multer";
import path from "path";
import fs from "fs";


const cvsDir = path.resolve(process.cwd(), "uploads", "cvs");
const avatarsDir = path.resolve(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(cvsDir)) {
  fs.mkdirSync(cvsDir, { recursive: true });
}
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}


const cvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, cvsDir);
  },
  filename: (req, file, cb) => {
    
    const userId = (req as any).user?.id || "unknown";
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
    cb(null, `${userId}_${timestamp}_${name}${ext}`);
  },
});


const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    
    const userId = (req as any).user?.id || "unknown";
    const timestamp = Date.now();
    cb(null, `${userId}_${timestamp}.jpg`);
  },
});


const cvFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOC, and DOCX files are allowed"));
  }
};


const avatarFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, WebP, GIF) are allowed"));
  }
};

export const uploadCV = multer({
  storage: cvStorage,
  fileFilter: cvFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, 
  },
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, 
  },
});


export function getCVPath(filename: string): string {
  return path.join(cvsDir, filename);
}


export function getAvatarPath(filename: string): string {
  return path.join(avatarsDir, filename);
}


export function deleteCVFile(filename: string): void {
  const filePath = getCVPath(filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}


export function deleteAvatarFile(filename: string): void {
  const filePath = getAvatarPath(filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

