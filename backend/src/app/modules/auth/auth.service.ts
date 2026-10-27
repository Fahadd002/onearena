import { Injectable } from '@nestjs/common';
import status from 'http-status';
import { JwtPayload } from 'jsonwebtoken';
import { auth } from '../../lib/auth';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { tokenUtils } from '../../utils/token';
import { UserRole, UserStatus } from '../../../generated/prisma/enums';
import { jwtUtils } from '../../utils/jwt';
import config from '../../../config/index';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { IChangePasswordPayload } from './auth.interface';

interface IRegisterUserPayload {
  name: string;
  email: string;
  password: string;
  role: 'owner' | 'user';
}

interface ILoginUserPayload {
  email: string;
  password: string;
}

interface IEmailSetupPayload {
  phone: string;
  email: string;
  currentPassword: string;
  newPassword: string;
}

interface IRecaptchaVerificationResponse {
  success?: unknown;
  action?: unknown;
  score?: unknown;
  hostname?: unknown;
  'error-codes'?: unknown;
}

@Injectable()
export class AuthService {
  async verifyRecaptchaToken(token: string, expectedAction: 'login' | 'register') {
    if (!token?.trim()) {
      throw new AppError(status.BAD_REQUEST, 'reCAPTCHA verification is required');
    }

    if (!config.recaptchaSecretKey) {
      throw new AppError(status.SERVICE_UNAVAILABLE, 'reCAPTCHA is not configured');
    }

    let verification: IRecaptchaVerificationResponse;

    try {
      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: config.recaptchaSecretKey,
          response: token,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Google reCAPTCHA returned ${response.status}`);
      }

      verification = await response.json() as IRecaptchaVerificationResponse;
    } catch (error) {
      console.error('Unable to verify reCAPTCHA token:', error);
      throw new AppError(status.SERVICE_UNAVAILABLE, 'Unable to verify reCAPTCHA right now');
    }

    const errorCodes = Array.isArray(verification['error-codes'])
      ? verification['error-codes'].filter((code): code is string => typeof code === 'string')
      : [];
    const invalidSecret = errorCodes.includes('invalid-input-secret') ||
      errorCodes.includes('missing-input-secret');

    if (verification.success !== true) {
      console.warn('Google reCAPTCHA rejected the token', {
        expectedAction,
        success: verification.success,
        hostname: verification.hostname,
        errorCodes,
      });

      throw new AppError(
        invalidSecret ? status.SERVICE_UNAVAILABLE : status.BAD_REQUEST,
        invalidSecret
          ? 'reCAPTCHA secret key is invalid or missing'
          : 'reCAPTCHA token was rejected. Please try again',
      );
    }

    if (verification.action !== expectedAction) {
      console.warn('Google reCAPTCHA action did not match', {
        expectedAction,
        actualAction: verification.action,
        hostname: verification.hostname,
      });
      throw new AppError(status.BAD_REQUEST, 'reCAPTCHA action mismatch. Please try again');
    }

    if (typeof verification.score !== 'number' || verification.score < 0.5) {
      console.warn('Google reCAPTCHA score was below the accepted threshold', {
        expectedAction,
        score: verification.score,
        hostname: verification.hostname,
      });
      throw new AppError(status.BAD_REQUEST, 'reCAPTCHA score was too low. Please try again');
    }
  }

  async registerUser(payload: IRegisterUserPayload) {
    const { name, email, password, role } = payload;

    const data = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
    });

    if (!data.user) {
      throw new AppError(status.NOT_FOUND, 'User Not Found');
    }

    try {
      const userRole = role === 'owner' ? UserRole.ADMIN : UserRole.USER;

      await prisma.user.update({
        where: { id: data.user.id },
        data: {
          role: userRole,
          status: UserStatus.ACTIVE,
          needPasswordChange: false,
        },
      });

      let profileVerified = false;

      if (userRole === UserRole.ADMIN) {
        const ownerProfile = await prisma.ownerProfile.create({
          data: {
            userId: data.user.id,
            verificationStatus: 'CREATED',
          },
        });
        profileVerified = ownerProfile.verificationStatus === 'APPROVED';
      }

      const registeredUser = {
        ...data.user,
        role: userRole,
      };

      const accessToken = tokenUtils.getAccessToken({
        userId: registeredUser.id,
        role: registeredUser.role,
        name: registeredUser.name,
        email: registeredUser.email,
        status: registeredUser.status,
        isDeleted: registeredUser.isDeleted,
        emailVerified: registeredUser.emailVerified,
        profileVerified,
      });

      const refreshToken = tokenUtils.getRefreshToken({
        userId: registeredUser.id,
        role: registeredUser.role,
        name: registeredUser.name,
        email: registeredUser.email,
        status: registeredUser.status,
        isDeleted: registeredUser.isDeleted,
        emailVerified: registeredUser.emailVerified,
        profileVerified,
      });

      return {
        ...data,
        user: registeredUser,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (data?.user?.id) {
        await prisma.user.deleteMany({
          where: {
            id: data.user.id,
          },
        });
      }
      throw error;
    }
  }

  async loginUser(payload: ILoginUserPayload) {
    const { email, password } = payload;

    const isEmail = email.includes('@');

    const user = isEmail
      ? await prisma.user.findUnique({ where: { email } })
      : await prisma.user.findUnique({ where: { phoneNumber: email } });

    if (!user) {
      throw new AppError(status.NOT_FOUND, 'User not found');
    }

    if (!user.email) {
      if (user.isDeleted || user.status !== UserStatus.ACTIVE) {
        throw new AppError(status.NOT_FOUND, 'User is not active');
      }

      const credentialAccount = await prisma.account.findFirst({
        where: { userId: user.id, providerId: 'credential' },
        select: { password: true },
      });

      if (
        !credentialAccount?.password ||
        !(await (await auth.$context).password.verify({
          hash: credentialAccount.password,
          password,
        }))
      ) {
        throw new AppError(status.UNAUTHORIZED, 'Invalid email or password');
      }

      return { needsEmailSetup: true, phone: user.phoneNumber ?? '' };
    }

    const data = await auth.api.signInEmail({
      body: {
        email: user.email,
        password,
      },
    });

    if (data.user.status === UserStatus.BLOCKED || data.user.status === UserStatus.SUSPENDED) {
      throw new AppError(status.FORBIDDEN, 'User is not active');
    }

    if (data.user.isDeleted || data.user.status !== UserStatus.ACTIVE) {
      throw new AppError(status.NOT_FOUND, 'User is not active');
    }

    let profileVerified = true;

    if (data.user.role === UserRole.ADMIN) {
      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: { userId: data.user.id },
      });
      profileVerified = ownerProfile ? ownerProfile.verificationStatus === 'APPROVED' : false;
    }

    const accessToken = tokenUtils.getAccessToken({
      userId: data.user.id,
      role: data.user.role,
      name: data.user.name,
      email: data.user.email,
      status: data.user.status,
      isDeleted: data.user.isDeleted,
      emailVerified: data.user.emailVerified,
      profileVerified,
    });

    const refreshToken = tokenUtils.getRefreshToken({
      userId: data.user.id,
      role: data.user.role,
      name: data.user.name,
      email: data.user.email,
      status: data.user.status,
      isDeleted: data.user.isDeleted,
      emailVerified: data.user.emailVerified,
      profileVerified,
    });

    return {
      ...data,
      accessToken,
      refreshToken,
    };
  }

  async getNewToken(refreshToken: string, sessionToken: string) {
    const isSessionTokenExist = await prisma.session.findUnique({
      where: {
        token: sessionToken,
      },
      include: {
        user: true,
      },
    });

    if (!isSessionTokenExist) {
      throw new AppError(status.UNAUTHORIZED, 'Invalid Session Token');
    }

    const verifiedRefershToken = jwtUtils.verifyToken(
      refreshToken,
      config.refreshTokenSecret as string,
    );
    if (!verifiedRefershToken.success) {
      throw new AppError(status.UNAUTHORIZED, 'Invalid Refresh Token');
    }

    const data = verifiedRefershToken.data as JwtPayload;

    let profileVerified = true;

    if (data.role === UserRole.ADMIN) {
      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: { userId: data.userId },
      });
      profileVerified = ownerProfile ? ownerProfile.verificationStatus === 'APPROVED' : false;
    }

    const newAccessToken = tokenUtils.getAccessToken({
      userId: data.userId,
      role: data.role,
      name: data.name,
      email: data.email,
      status: data.status,
      isDeleted: data.isDeleted,
      emailVerified: data.emailVerified,
      profileVerified,
    });

    const newRefreshToken = tokenUtils.getRefreshToken({
      userId: data.userId,
      role: data.role,
      name: data.name,
      email: data.email,
      status: data.status,
      isDeleted: data.isDeleted,
      emailVerified: data.emailVerified,
      profileVerified,
    });

    const { token } = await prisma.session.update({
      where: {
        token: sessionToken,
      },
      data: {
        token: sessionToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 60 * 24 * 1000),
        updatedAt: new Date(),
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      sessionToken: token,
    };
  }

  async setupEmail(payload: IEmailSetupPayload) {
    const { phone, email, currentPassword, newPassword } = payload;

    if (!phone?.trim() || !email?.trim() || !currentPassword || !newPassword) {
      throw new AppError(status.BAD_REQUEST, 'Phone, email, and passwords are required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new AppError(status.BAD_REQUEST, 'Enter a valid email address');
    }

    if (
      newPassword.length < 6 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[@$!%*?&]/.test(newPassword)
    ) {
      throw new AppError(status.BAD_REQUEST, 'New password does not meet the requirements');
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber: phone },
      select: { id: true, email: true, isDeleted: true, status: true },
    });

    if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
      throw new AppError(status.NOT_FOUND, 'User not found');
    }

    if (user.email) {
      throw new AppError(status.BAD_REQUEST, 'Email is already set up for this account');
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existingEmail) {
      throw new AppError(status.CONFLICT, 'Email already in use');
    }

    const credentialAccount = await prisma.account.findFirst({
      where: { userId: user.id, providerId: 'credential' },
      select: { id: true, password: true },
    });

    if (
      !credentialAccount?.password ||
      !(await (await auth.$context).password.verify({
        hash: credentialAccount.password,
        password: currentPassword,
      }))
    ) {
      throw new AppError(status.UNAUTHORIZED, 'Invalid current password');
    }

    const hashedPassword = await (await auth.$context).password.hash(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          email: normalizedEmail,
          emailVerified: false,
          needPasswordChange: false,
        },
      }),
      prisma.account.update({
        where: { id: credentialAccount.id },
        data: { password: hashedPassword },
      }),
    ]);

    await auth.api.sendVerificationOTP({
      body: {
        email: normalizedEmail,
        type: 'email-verification',
      },
    });
  }
  
  async getMe(user: IRequestUser) {
    const userExist = await prisma.user.findUnique({
      where: {
        id: user.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phoneNumber: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt:true,
        ownerProfile: {
          select: {
            verificationStatus: true,
          },
        },
      },
    });

    if (!userExist) {
      throw new AppError(status.NOT_FOUND, 'User Not Found');
    }

    const profileVerified =userExist.role === UserRole.ADMIN ? userExist.ownerProfile?.verificationStatus === 'APPROVED' : true;

    return {
      id: userExist.id,
      name: userExist.name,
      email: userExist.email,
      image: userExist.image,
      phoneNumber: userExist.phoneNumber,
      role: userExist.role,
      status: userExist.status,
      emailVerified: userExist.emailVerified,
      profileVerified,
      createdAt: userExist.createdAt
    };
  }

  async changePassword(
    payload: IChangePasswordPayload,
    sessionToken: string,
  ) {
    const session = await auth.api.getSession({
      headers: new Headers({
        Authorization: `Bearer ${sessionToken}`,
      }),
    });

    if (!session) {
      throw new AppError(status.UNAUTHORIZED, 'Invalid session token');
    }

    const { currentPassword, newPassword } = payload;

    const result = await auth.api.changePassword({
      body: {
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      },
      headers: new Headers({
        Authorization: `Bearer ${sessionToken}`,
      }),
    });

    if (session.user.needPasswordChange) {
      await prisma.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          needPasswordChange: false,
        },
      });
    }

    let profileVerified = true;

    if (session.user.role === UserRole.ADMIN) {
      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: { userId: session.user.id },
      });
      profileVerified = ownerProfile ? ownerProfile.verificationStatus === 'APPROVED' : false;
    }

    const accessToken = tokenUtils.getAccessToken({
      userId: session.user.id,
      role: session.user.role,
      name: session.user.name,
      email: session.user.email,
      status: session.user.status,
      isDeleted: session.user.isDeleted,
      emailVerified: session.user.emailVerified,
      profileVerified,
    });

    const refreshToken = tokenUtils.getRefreshToken({
      userId: session.user.id,
      role: session.user.role,
      name: session.user.name,
      email: session.user.email,
      status: session.user.status,
      isDeleted: session.user.isDeleted,
      emailVerified: session.user.emailVerified,
      profileVerified,
    });

    return {
      ...result,
      accessToken,
      refreshToken,
    };
  }

  async logoutUser(sessionToken: string) {
    const result = await auth.api.signOut({
      headers: new Headers({
        Authorization: `Bearer ${sessionToken}`,
      }),
    });

    return result;
  }

  async varifyEmail(email: string, otp: string) {
    const result = await auth.api.verifyEmailOTP({
      body: {
        email,
        otp,
      },
    });

    if (result.status && !result.user.emailVerified) {
      await prisma.user.update({
        where: {
          email,
        },
        data: {
          emailVerified: true,
        },
      });
    }
  }

  async resendVerificationOtp(email: string) {
    await auth.api.sendVerificationOTP({
      body: {
        email,
        type: 'email-verification',
      },
    });
  }

  async forgetPassword(email: string) {
    const isUserExist = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!isUserExist) {
      throw new AppError(status.NOT_FOUND, 'User Not Found');
    }

    if (!isUserExist.emailVerified) {
      throw new AppError(status.BAD_REQUEST, 'Email is not verified');
    }

    if (isUserExist.isDeleted || isUserExist.status !== UserStatus.ACTIVE) {
      throw new AppError(status.NOT_FOUND, 'User Not Found');
    }

    await auth.api.requestPasswordResetEmailOTP({
      body: {
        email,
      },
    });
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const isUserExist = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!isUserExist) {
      throw new AppError(status.NOT_FOUND, 'User not found');
    }

    if (!isUserExist.emailVerified) {
      throw new AppError(status.BAD_REQUEST, 'Email not verified');
    }

    if (isUserExist.isDeleted || isUserExist.status !== UserStatus.ACTIVE) {
      throw new AppError(status.NOT_FOUND, 'User not found');
    }

    await auth.api.resetPasswordEmailOTP({
      body: {
        email,
        otp,
        password: newPassword,
      },
    });

    if (isUserExist.needPasswordChange) {
      await prisma.user.update({
        where: {
          id: isUserExist.id,
        },
        data: {
          needPasswordChange: false,
        },
      });
    }

    await prisma.session.deleteMany({
      where: {
        userId: isUserExist.id,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async googleLoginSuccess(session: Record<string, any>) {
    const profilePhoto = session.user.image || null;
    const existingUser = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
    });

    if (!existingUser) {
      await prisma.user.create({
        data: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: profilePhoto,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          needPasswordChange: false,
          isDeleted: false,
        },
      });
    } else if (profilePhoto && existingUser.image !== profilePhoto) {
      await prisma.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          image: profilePhoto,
        },
      });
    }

    const accessToken = tokenUtils.getAccessToken({
      userId: session.user.id,
      role: session.user.role,
      name: session.user.name,
      email: session.user.email,
      status: session.user.status ?? UserStatus.ACTIVE,
      isDeleted: false,
      emailVerified: true,
    });

    const refreshToken = tokenUtils.getRefreshToken({
      userId: session.user.id,
      role: session.user.role,
      name: session.user.name,
      email: session.user.email,
      status: session.user.status ?? UserStatus.ACTIVE,
      isDeleted: false,
      emailVerified: true,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async updateProfileImage(userId: string, file: Express.Multer.File) {
    const imageUrl = `/uploads/user-profile/${userId}/${file.filename}`;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
      select: { id: true, name: true, email: true, image: true },
    });
    return user;
  }

  async updateUserProfile(userId: string, body: { name?: string; phoneNumber?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name,
        phoneNumber: body.phoneNumber,
      },
      select: { id: true, name: true, email: true, image: true, phoneNumber: true, role: true },
    });
    return user;
  }
}
