import fs from 'fs';
import path from 'path';
import multer from 'multer';

const UPLOADS_ROOT = process.cwd();

/**
 * Resolve a public upload url (e.g. /uploads/turfs/abc/x.jpg) or an absolute
 * filesystem path to an absolute path under the project root.
 */
export function resolveFilePath(filePathOrUrl: string): string {
  // Public upload URLs always start with '/' (e.g. /uploads/turfs/abc/x.jpg).
  // Strip the leading slash and resolve against the backend uploads root so
  // Windows path.isAbsolute('/...') does not short-circuit to the drive root.
  return path.join(UPLOADS_ROOT, filePathOrUrl.replace(/^\//, ''));
}

/**
 * Delete a single physical file given a public upload url or absolute path.
 * Silently ignores missing files and unlink errors.
 */
export function deleteFile(filePathOrUrl: string): void {
  const filePath = resolveFilePath(filePathOrUrl);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Delete multiple physical files given their public upload urls or absolute paths.
 */
export function deleteFiles(paths: string[]): void {
  for (const p of paths) {
    deleteFile(p);
  }
}

type FileNameCallback = (
  req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, filename: string) => void,
) => void;

/**
 * Create a multer disk storage engine that writes files into the given
 * destination directory (relative to project root) with unique filenames.
 * `destination` may be a static path or a per-request callback `(req, file) => string`.
 * An optional `filename` callback can override the default unique-name logic.
 */
export function diskStorage(
  destination: string | ((req: any, file: Express.Multer.File) => string),
  filename?: FileNameCallback,
): multer.StorageEngine {
  const defaultFilename: FileNameCallback = (_req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const uniqueName = `${timestamp}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  };

  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = typeof destination === 'function' ? destination(_req, _file) : destination;
      const full = path.join(UPLOADS_ROOT, dir);
      if (!fs.existsSync(full)) {
        fs.mkdirSync(full, { recursive: true });
      }
      cb(null, full);
    },
    filename: filename ?? defaultFilename,
  });
}

/**
 * Build multer options ({ storage, limits, fileFilter }) for NestJS
 * `FileInterceptor` / `FilesInterceptor`. Destination may be static or a
 * per-request callback.
 */
export function multerOptions(
  destination: string | ((req: any, file: Express.Multer.File) => string),
  opts: {
    filename?: FileNameCallback;
    limits?: { fileSize?: number };
    fileFilter?: any;
  } = {},
) {
  const { filename, limits, fileFilter } = opts;
  return {
    storage: diskStorage(destination, filename),
    limits: { fileSize: 5 * 1024 * 1024, ...limits },
    fileFilter: fileFilter ?? imageFileFilter,
  } as any;
}

/**
 * Create a configured multer instance for disk uploads (for `.fields()`,
 * `.single()`, `.array()` callers).
 */
export function multerInstance(
  destination: string | ((req: any, file: Express.Multer.File) => string),
  opts: {
    filename?: FileNameCallback;
    limits?: { fileSize?: number };
    fileFilter?: any;
  } = {},
) {
  const { filename, limits, fileFilter } = opts;
  return multer({
    storage: diskStorage(destination, filename),
    limits: { fileSize: 5 * 1024 * 1024, ...limits },
    fileFilter: fileFilter ?? imageFileFilter,
  } as unknown as multer.Options);
}

/**
 * Create a pre-configured multer handler for disk uploads.
 *
 * @returns a multer single-file or array handler depending on maxCount
 */
export function multerHandler(
  destination: string | ((req: any, file: Express.Multer.File) => string),
  opts: {
    filename?: FileNameCallback;
    limits?: { fileSize?: number };
    fileFilter?: any;
    fieldName?: string;
    maxCount?: number;
  } = {},
) {
  const { filename, limits, fileFilter, fieldName = 'file', maxCount } = opts;
  const upload = multerInstance(destination, { filename, limits, fileFilter });
  return maxCount ? upload.array(fieldName, maxCount) : upload.single(fieldName);
}

/**
 * Default mime filter: JPEG, PNG, JPG, WebP images only.
 */
export const imageFileFilter = (_req: any, file: any, cb: any) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  cb(null, allowed.includes(file.mimetype));
};

/**
 * Default mime filter: JPEG, PNG, JPG, WebP images and PDF documents.
 */
export const documentFileFilter = (_req: any, file: any, cb: any) => {
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'application/pdf',
  ];
  cb(null, allowed.includes(file.mimetype));
};

export const fileUploader = {
  deleteFile,
  deleteFiles,
  diskStorage,
  multerOptions,
  multerInstance,
  multerHandler,
  imageFileFilter,
  documentFileFilter,
};
