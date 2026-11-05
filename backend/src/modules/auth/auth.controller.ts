import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuditLogService } from '../audit/audit-log.service';

@ApiTags('auth')
@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly audit: AuditLogService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 5 } }) // max 5 login attempts per minute per IP
  @ApiOperation({ summary: 'Log in with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const { user } = await this.authService.login(dto);
    const token = this.authService.signToken({ sub: user.id, email: user.email, role: user.role });
    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
    });

    await this.audit.log({
      userId: user.id,
      action: 'AUTH_LOGIN',
      resource: 'user',
      resourceId: user.id,
      metadata: { ip: req.ip, email: user.email },
    });

    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Log out' })
  async logout(
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request & { user?: { id: string } },
  ) {
    res.clearCookie('access_token');

    if (req.user?.id) {
      await this.audit.log({
        userId: req.user.id,
        action: 'AUTH_LOGOUT',
        resource: 'user',
        resourceId: req.user.id,
        metadata: { ip: req.ip },
      });
    }

    return { message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  getMe(@Req() req: Request & { user: { id: string } }) {
    return this.authService.getMe(req.user.id);
  }
}
