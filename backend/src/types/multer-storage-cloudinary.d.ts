declare module "multer-storage-cloudinary" {
  import type { StorageEngine } from "multer";

  export interface CloudinaryStorageParams {
    folder?: string;
    public_id?: string;
    resource_type?: "image" | "video" | "raw" | "auto";
    [key: string]: unknown;
  }

  export interface CloudinaryStorageOptions {
    cloudinary: unknown;
    params?:
      | CloudinaryStorageParams
      | ((
          req: Express.Request,
          file: Express.Multer.File,
        ) => CloudinaryStorageParams | Promise<CloudinaryStorageParams>);
  }

  export class CloudinaryStorage implements StorageEngine {
    constructor(options: CloudinaryStorageOptions);
    _handleFile(
      req: Express.Request,
      file: Express.Multer.File,
      callback: (error?: unknown, info?: Partial<Express.Multer.File>) => void,
    ): void;
    _removeFile(
      req: Express.Request,
      file: Express.Multer.File,
      callback: (error: Error | null) => void,
    ): void;
  }
}
