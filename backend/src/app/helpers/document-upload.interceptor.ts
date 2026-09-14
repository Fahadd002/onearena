import { Injectable, NestInterceptor, ExecutionContext, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

@Injectable()
export class DocumentUploadInterceptor implements NestInterceptor {
  private uploadMiddleware: any;

  constructor() {
    const storage = multer.diskStorage({
      destination: (req: any, _file: any, cb: any) => {
        const userId = req.user?.id || req.user?.userId || 'temp';
        const dir = path.join(process.cwd(), `uploads/owner-profile/${userId}`);
        
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        cb(null, dir);
      },
      filename: (_req: any, file: any, cb: any) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        
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

    this.uploadMiddleware = multer({
      storage: storage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`File type ${file.mimetype} not allowed. Allowed: JPEG, PNG, PDF`));
        }
      }
    }).fields([
      { name: 'nidImageFront', maxCount: 1 },
      { name: 'nidImageBack', maxCount: 1 },
      { name: 'businessRegistrationDocument', maxCount: 1 },
      { name: 'tradeLicenseDocument', maxCount: 1 },
      { name: 'taxIdentificationDocument', maxCount: 1 },
      { name: 'businessLogo', maxCount: 1 }
    ]);
  }

  intercept(context: ExecutionContext, next: any): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return new Observable((observer) => {
      this.uploadMiddleware(request, response, (err: any) => {
        if (err) {
          observer.error(new BadRequestException(err.message || 'File upload failed'));
        } else {
          next.handle().subscribe({
            next: (data: any) => observer.next(data),
            error: (error: any) => observer.error(error),
            complete: () => observer.complete()
          });
        }
      });
    });
  }
}
