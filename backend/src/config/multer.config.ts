import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinaryUpload } from "./cloudinary.config";

const storage = new CloudinaryStorage({
    cloudinary: cloudinaryUpload,
    params: async (_req: Express.Request, file: Express.Multer.File) => {
        const originalName = file.originalname;
        const extension = originalName.split(".").pop()?.toLowerCase();

        const fileNameWithoutExtension = originalName
            .split(".")
            .slice(0, -1)
            .join(".")
            .toLowerCase()
            .replace(/\s+/g, "-")
              // eslint-disable-next-line no-useless-escape
              .replace(/[^a-z0-9\-]/g, "");

        const uniqueName =
            Math.random().toString(36).substring(2) +
            "-" +
            Date.now() +
            "-" +
            fileNameWithoutExtension;

        const folder = extension === "pdf" ? "pdfs" : "images";

        return {
            folder: `one_arena/${folder}`,
            public_id: uniqueName,
            resource_type: file.mimetype === "application/pdf" ? "raw" : "auto"
        };
    }
});

export const multerUpload = multer({ storage });
