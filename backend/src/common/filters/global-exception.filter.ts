import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import status from 'http-status';
import z from 'zod';
import config from '../../config/index';
import AppError from '../../config/errorHelpers/AppError';
import { deleteUploadedFilesFromGlobalErrorHandler } from '../../app/utils/deleteUploadedFilesFromGlobalErrorHandler';
import { TErrorResponse, TErrorSources } from '../../app/interfaces/error.interface';
import { Prisma } from '../../generated/prisma/client';
import {
  handlePrismaClientKnownRequestError,
  handlePrismaClientUnknownError,
  handlePrismaClientValidationError,
  handlerPrismaClientInitializationError,
  handlerPrismaClientRustPanicError,
} from '../../config/errorHelpers/handlePrismaErrors';
import { handleZodError } from '../../config/errorHelpers/handleZodError';

const isPrismaKnownRequestError = (
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError ||
  (typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    /^P\d{4}$/.test((error as { code: string }).code));

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async catch(err: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    // Preserve Express notFound middleware response shape
    if (err instanceof NotFoundException) {
      res.status(status.NOT_FOUND).json({
        success: false,
        message: `Route ${req.originalUrl} Not Found`,
      });
      return;
    }

    if (config.env === 'development') {
      console.log('Error from Global Error Handler', err);
    }

    await deleteUploadedFilesFromGlobalErrorHandler(req);

    let errorSources: TErrorSources[] = [];
    let statusCode: number = status.INTERNAL_SERVER_ERROR;
    let message: string = 'Internal Server Error';
    let stack: string | undefined = undefined;

    if (isPrismaKnownRequestError(err)) {
      const simplifiedError = handlePrismaClientKnownRequestError(err);
      statusCode = simplifiedError.statusCode as number;
      message = simplifiedError.message;
      errorSources = [...simplifiedError.errorSources];
      stack = err.stack;
    } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
      const simplifiedError = handlePrismaClientUnknownError(err);
      statusCode = simplifiedError.statusCode as number;
      message = simplifiedError.message;
      errorSources = [...simplifiedError.errorSources];
      stack = err.stack;
    } else if (err instanceof Prisma.PrismaClientValidationError) {
      const simplifiedError = handlePrismaClientValidationError(err);
      statusCode = simplifiedError.statusCode as number;
      message = simplifiedError.message;
      errorSources = [...simplifiedError.errorSources];
      stack = err.stack;
    } else if (err instanceof Prisma.PrismaClientRustPanicError) {
      const simplifiedError = handlerPrismaClientRustPanicError();
      statusCode = simplifiedError.statusCode as number;
      message = simplifiedError.message;
      errorSources = [...simplifiedError.errorSources];
      stack = err.stack;
    } else if (err instanceof Prisma.PrismaClientInitializationError) {
      const simplifiedError = handlerPrismaClientInitializationError(err);
      statusCode = simplifiedError.statusCode as number;
      message = simplifiedError.message;
      errorSources = [...simplifiedError.errorSources];
      stack = err.stack;
    } else if (err instanceof z.ZodError) {
      const simplifiedError = handleZodError(err);
      statusCode = simplifiedError.statusCode as number;
      message = simplifiedError.message;
      errorSources = [...simplifiedError.errorSources];
      stack = err.stack;
    } else if (err instanceof AppError) {
      statusCode = err.statusCode;
      message = err.message;
      stack = err.stack;
      errorSources = [
        {
          path: '',
          message: err.message,
        },
      ];
    } else if (
      typeof err?.body?.message === 'string' &&
      (typeof err?.statusCode === 'number' || typeof err?.status === 'number')
    ) {
      statusCode = err.statusCode ?? err.status;
      message = err.body.message;
      errorSources = [
        {
          path: err.body.code || 'AUTH_ERROR',
          message: err.body.message,
        },
      ];
    } else if (err instanceof HttpException) {
      statusCode = err.getStatus();
      const response = err.getResponse();
      message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message as string) ||
            err.message;
      if (Array.isArray(message)) {
        message = message.join(', ');
      }
      stack = err.stack;
      errorSources = [
        {
          path: '',
          message: String(message),
        },
      ];
    } else if (err instanceof Error) {
      statusCode = status.INTERNAL_SERVER_ERROR;
      message = err.message;
      stack = err.stack;
      errorSources = [
        {
          path: '',
          message: err.message,
        },
      ];
    }

    const errorResponse: TErrorResponse = {
      success: false,
      message: message,
      errorSources,
      error: config.env === 'development' ? err : undefined,
      stack: config.env === 'development' ? stack : undefined,
    };

    res.status(statusCode).json(errorResponse);
  }
}
