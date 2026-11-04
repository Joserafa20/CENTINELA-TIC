import {
  Injectable,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedAdminIfMissing();
  }

  async login(dto: LoginDto): Promise<{ user: { id: string; email: string; role: string } }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return { user: { id: user.id, email: user.email, role: user.role } };
  }

  signToken(payload: { sub: string; email: string; role: string }): string {
    return this.jwt.sign(payload);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async seedAdminIfMissing() {
    const adminEmail = this.config.get<string>('app.adminEmail');
    const adminPassword = this.config.get<string>('app.adminPassword');
    if (!adminEmail || !adminPassword) return;

    const existing = await this.prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) return;

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await this.prisma.user.create({
      data: { email: adminEmail, passwordHash },
    });
  }
}
