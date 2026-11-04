import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['access_token'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('app.jwtSecret') ?? '',
    });
  }

  validate(payload: { sub: string; email: string; role: string }) {
    if (!payload?.sub) throw new UnauthorizedException();
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
