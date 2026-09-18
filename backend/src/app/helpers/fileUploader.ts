import multer from "multer"
import path from "path"
import { v2 as cloudinary } from 'cloudinary';

import fs from 'fs';
import config from "../../config/index";

const storage = multer.diskStorage({
  destination: function (req: any, _file: any, cb: any) {
    // Get user ID from request (set by auth guard)
    const userId = req.user?.id || 'temp';
    const dir = path.join(process.cwd(), `uploads/owner-profile/${userId}`);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: function (_req: any, file: any, cb: any) {
    // Generate unique filename: field-name-timestamp.ext
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    
    // Map form field names to descriptive filenames
    const fieldMapping: Record<string, string> = {
      'nidImageFront': 'nid-front',
      'nidImageBack': 'nid-back',
      'businessRegistrationDocument': 'business-registration',
      'tradeLicenseDocument': 'trade-license',
      'taxIdentificationDocument': 'tax-identification',
      'businessLogo': 'business-logo'
    };
    
    const mappedName = fieldMapping[file.fieldname] || file.fieldname;
    cb(null, `${mappedName}-${timestamp}${ext}`);
  }
});

async function uploadToCloudinary(file: Express.Multer.File) {
    // Configuration
    cloudinary.config({ 
        cloud_name: config.cloudinary.cloud_name, 
        api_key: config.cloudinary.api_key, 
        api_secret: config.cloudinary.api_secret 
    });
    
    // Upload an image
     const uploadResult = await cloudinary.uploader
       .upload(
           file.path, {
               public_id: `${file.originalname}-${Date.now()}`,
           }
       )
       .catch((error) => {
            throw error;
       });
       fs.unlinkSync(file.path);
    
    return uploadResult;
    
    // // Optimize delivery by resizing and applying auto-format and auto-quality
    // const optimizeUrl = cloudinary.url(`${uploadResult?.public_id}`, {
    //     fetch_format: 'auto',
    //     quality: 'auto'
    // });
    
    // console.log(optimizeUrl);
    
    // // Transform the image: auto-crop to square aspect_ratio
    // const autoCropUrl = cloudinary.url(`${uploadResult?.public_id}`, {
    //     crop: 'auto',
    //     gravity: 'auto',
    //     width: 500,
    //     height: 500,
    // });
    
    // console.log(autoCropUrl);    
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Allowed: JPEG, PNG, PDF`));
    }
  }
});

export const fileUploader = {
  upload,
  uploadToCloudinary
}
