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

@Injectable()
export class AuthService {
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
            verificationStatus: 'SUBMITTED',
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

    const data = await auth.api.signInEmail({
      body: {
        email,
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

  async getMe(user: IRequestUser) {
    const userExist = await prisma.user.findUnique({
      where: {
        id: user.userId,
      },
      include: {
        ownerProfile: true,
        managerProfile: true,
      },
    });
    if (!userExist) {
      throw new AppError(status.NOT_FOUND, 'User Not Found');
    }

    const profileVerified =
      userExist.role === UserRole.ADMIN
        ? userExist.ownerProfile?.verificationStatus === 'APPROVED'
        : true;

    return { ...userExist, profileVerified };
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
}
