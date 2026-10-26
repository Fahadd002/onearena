/* eslint-disable @typescript-eslint/no-explicit-any */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { UserStatus } from '../../generated/prisma/enums';
import { cookieUtils } from '../../app/utils/cookie';
import prisma from '../../shared/prisma';
import { jwtUtils } from '../../app/utils/jwt';
import config from '../../config/index';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    try {
      const sessionToken = cookieUtils.getCookie(req, 'better-auth.session_token');
      if (!sessionToken) return true;

      const sessionTokenCandidates = [sessionToken, sessionToken.split('.')[0]];
      const sessionExists = await prisma.session.findFirst({
        where: {
          token: { in: sessionTokenCandidates },
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!sessionExists?.user) return true;

      const user = sessionExists.user;
      if (
        user.status === UserStatus.INACTIVE ||
        user.status === UserStatus.SUSPENDED ||
        user.status === UserStatus.BLOCKED ||
        user.isDeleted
      ) {
        return true;
      }

      const now = new Date();
      const expiresAt = new Date(sessionExists.expiresAt);
      const createdAt = new Date(sessionExists.createdAt);
      const sessionLifeTime = expiresAt.getTime() - createdAt.getTime();
      const timeRemaining = expiresAt.getTime() - now.getTime();
      const percentRemaining = (timeRemaining / sessionLifeTime) * 100;

      if (percentRemaining < 20) {
        res.setHeader('X-Session-Refresh', 'true');
        res.setHeader('X-Session-Expires-At', expiresAt.toISOString());
        res.setHeader('X-Time-Remaining', timeRemaining.toString());
      }

      const accessToken = cookieUtils.getCookie(req, 'accessToken');
      if (!accessToken) return true;

      const verifiedToken = jwtUtils.verifyToken(accessToken, config.accessTokenSecret as string);
      if (!verifiedToken.success) return true;

      if (verifiedToken.data?.userId === user.id) {
        req.user = {
          userId: user.id,
          role: user.role,
          email: user.email,
        };
      }

      return true;
    } catch {
      return true;
    }
  }
}
