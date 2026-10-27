import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import status from 'http-status';
import { AuthService } from './auth.service';
import { tokenUtils } from '../../utils/token';
import sendResponse from '../../../shared/sendResponse';
import AppError from '../../../config/errorHelpers/AppError';
import { cookieUtils } from '../../utils/cookie';
import config from '../../../config/index';
import { auth } from '../../lib/auth';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../../generated/prisma/enums';
import { fileUploader } from '../../helpers/file';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import prisma from '../../../shared/prisma';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async registerUser(@Body() payload: Record<string, unknown>, @Res() res: Response) {
    await this.authService.verifyRecaptchaToken(
      typeof payload.recaptchaToken === 'string' ? payload.recaptchaToken : '',
      'register',
    );
    const result = await this.authService.registerUser(
      payload as {
        name: string;
        email: string;
        password: string;
        role: 'owner' | 'user';
      },
    );
    const { accessToken, refreshToken, token, ...rest } = result;

    tokenUtils.setAccessTokenCookie(res, accessToken);
    tokenUtils.setRefreshTokenCookie(res, refreshToken);
    tokenUtils.setBetterAuthSessionCookie(res, token as string);

    sendResponse(res, {
      statusCode: status.CREATED,
      success: true,
      message: 'User registered successfully',
      data: {
        ...rest,
        token,
        accessToken,
        refreshToken,
      },
    });
  }

  @Post('login')
  async loginUser(@Body() payload: Record<string, unknown>, @Res() res: Response) {
    await this.authService.verifyRecaptchaToken(
      typeof payload.recaptchaToken === 'string' ? payload.recaptchaToken : '',
      'login',
    );
    const result = await this.authService.loginUser(
      payload as { email: string; password: string },
    );

    if ('needsEmailSetup' in result) {
      sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: 'Email setup is required',
        data: result,
      });
      return;
    }

    const { accessToken, refreshToken, token, ...rest } = result;

    tokenUtils.setAccessTokenCookie(res, accessToken);
    tokenUtils.setRefreshTokenCookie(res, refreshToken);
    tokenUtils.setBetterAuthSessionCookie(res, token);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'User logged in successfully',
      data: {
        token,
        accessToken,
        refreshToken,
        ...rest,
      },
    });
  }

  @Post('phone-login/setup-email')
  async setupEmail(
    @Body()
    body: {
      phone: string;
      email: string;
      currentPassword: string;
      newPassword: string;
    },
    @Res() res: Response,
  ) {
    await this.authService.setupEmail(body);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Email and password updated. Check your email for a verification code.',
      data: null,
    });
  }

  @Get('me')
  @AuthRoles(
    UserRole.USER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.SUPER_ADMIN,
  )
  @UseGuards(CheckAuthGuard)
  async getMe(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    const result = await this.authService.getMe(user);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'User fetched successfully',
      data: result,
    });
  }

  @Post('refresh-token')
  async getNewToken(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies.refreshToken;
    const betterAuthSessionToken = req.cookies['better-auth.session_token'];
    if (!refreshToken) {
      throw new AppError(status.UNAUTHORIZED, 'Refresh token is missing');
    }
    const result = await this.authService.getNewToken(
      refreshToken,
      betterAuthSessionToken,
    );

    const { accessToken, refreshToken: newRefreshToken, sessionToken } = result;

    tokenUtils.setAccessTokenCookie(res, accessToken);
    tokenUtils.setRefreshTokenCookie(res, newRefreshToken);
    tokenUtils.setBetterAuthSessionCookie(res, sessionToken);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'New tokens generated successfully',
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        sessionToken,
      },
    });
  }

  @Post('change-password')
  @AuthRoles( UserRole.USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN,)
  @UseGuards(CheckAuthGuard)
  async changePassword(
    @Body() payload: Record<string, unknown>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const betterAuthSessionToken = req.cookies['better-auth.session_token'];

    const result = await this.authService.changePassword(
      payload as { currentPassword: string; newPassword: string },
      betterAuthSessionToken,
    );

    const { accessToken, refreshToken, token } = result;

    tokenUtils.setAccessTokenCookie(res, accessToken);
    tokenUtils.setRefreshTokenCookie(res, refreshToken);
    tokenUtils.setBetterAuthSessionCookie(res, token as string);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Password changed successfully',
      data: result,
    });
  }

  @Post('logout')
  @AuthRoles(
    UserRole.USER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.SUPER_ADMIN,
  )
  
  @UseGuards(CheckAuthGuard)
  async logoutUser(@Req() req: Request, @Res() res: Response) {
    const betterAuthSessionToken = req.cookies['better-auth.session_token'];
    const result = await this.authService.logoutUser(betterAuthSessionToken);
    const cookieSecurity = {
      httpOnly: true,
      secure: (req as any).secure || (req as any).headers?.['x-forwarded-proto'] === 'https',
      sameSite: ((req as any).secure || (req as any).headers?.['x-forwarded-proto'] === 'https') ? ("none" as const) : ("lax" as const),
      path: '/',
    };

    cookieUtils.clearCookie(res, 'accessToken', {
      ...cookieSecurity,
    });
    cookieUtils.clearCookie(res, 'refreshToken', {
      ...cookieSecurity,
    });
    cookieUtils.clearCookie(res, 'better-auth.session_token', {
      ...cookieSecurity,
    });

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'User logged out successfully',
      data: result,
    });
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() body: { email: string; otp: string },
    @Res() res: Response,
  ) {
    const { email, otp } = body;

    await this.authService.varifyEmail(email, otp);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Email verified successfully',
      data: null,
    });
  }

  @Post('resend-verification-otp')
  async resendVerificationOtp(
    @Body() body: { email: string },
    @Res() res: Response,
  ) {
    await this.authService.resendVerificationOtp(body.email);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Verification OTP sent successfully',
      data: null,
    });
  }

  @Post('forget-password')
  async forgetPassword(
    @Body() body: { email: string },
    @Res() res: Response,
  ) {
    const { email } = body;

    await this.authService.forgetPassword(email);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message:
        'A password reset OTP has been sent to your email address. Please check your inbox.',
      data: null,
    });
  }

  @Post('reset-password')
  async resetPassword(
    @Body() body: { email: string; otp: string; newPassword: string },
    @Res() res: Response,
  ) {
    const { email, otp, newPassword } = body;

    await this.authService.resetPassword(email, otp, newPassword);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message:
        'Your password has been reset successfully. You can now log in with your new password.',
      data: null,
    });
  }

  @Get('login/google')
  googleLogin(
    @Query('redirect') redirect: string | undefined,
    @Res() res: Response,
  ) {
    const redirectPath = redirect || '/';

    const encodedRedirectPath = encodeURIComponent(redirectPath as string);

    const callbackURL = `${config.betterAuthUrl}/api/v1/auth/google/success?redirect=${encodedRedirectPath}`;

    res.render('googleRedirect', {
      callbackURL: callbackURL,
      betterAuthUrl: config.betterAuthUrl,
    });
  }

  @Get('google/success')
  async googleLoginSuccess(
    @Query('redirect') redirect: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const sessionToken = req.cookies['better-auth.session_token'];

    if (!sessionToken) {
      return res.redirect(`${config.frontendUrl}/login?error=oauth_failed`);
    }

    const session = await auth.api.getSession({
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    if (!session) {
      return res.redirect(`${config.frontendUrl}/login?error=no_session_found`);
    }

    if (session && !session.user) {
      return res.redirect(`${config.frontendUrl}/login?error=no_user_found`);
    }

    const result = await this.authService.googleLoginSuccess(session);

    const { accessToken, refreshToken } = result;

    tokenUtils.setAccessTokenCookie(res, accessToken);
    tokenUtils.setRefreshTokenCookie(res, refreshToken);
    tokenUtils.setBetterAuthSessionCookie(res, session.session.token);

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const userRole = dbUser?.role || session.user.role || UserRole.USER;

    const getDefaultDashboardRoute = (role: string) => {
      if (role === UserRole.SUPER_ADMIN) return '/super-admin/dashboard';
      if (role === UserRole.ADMIN) return '/admin/dashboard';
      if (role === UserRole.MANAGER) return '/manager/dashboard';
      if (role === UserRole.USER) return '/';
      return '/';
    };

    const isValidRedirectPath =
      redirect && redirect.startsWith('/') && !redirect.startsWith('//');

    const defaultRoute = getDefaultDashboardRoute(userRole);
    const finalRedirectPath = isValidRedirectPath ? redirect : defaultRoute;

    res.redirect(`${config.frontendUrl}${finalRedirectPath}`);
  }

  @Get('oauth/error')
  handleOAuthError(
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const oauthError = (error as string) || 'oauth_failed';
    res.redirect(`${config.frontendUrl}/login?error=${oauthError}`);
  }

  @Post('user/profile/image')
  @AuthRoles(UserRole.USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', fileUploader.multerOptions((req: any) => {
      const userId = req.user?.id || req.user?.userId;
      return `uploads/user-profile/${userId}`;
    })),
  )
  async uploadProfileImage(
    @CurrentUser() user: IRequestUser,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    const result = await this.authService.updateProfileImage(user.userId, file);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'Profile image uploaded successfully', data: result });
  }

  @Put('user/profile')
  @AuthRoles(UserRole.USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async updateProfile(
    @CurrentUser() user: IRequestUser,
    @Body() body: { name?: string; phoneNumber?: string },
    @Res() res: Response,
  ) {
    const result = await this.authService.updateUserProfile(user.userId, body);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'Profile updated successfully', data: result });
  }
}
