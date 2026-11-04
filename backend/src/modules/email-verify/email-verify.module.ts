import { Module } from '@nestjs/common';
import { EmailVerifyService } from './email-verify.service';
import { EmailVerifyController } from './email-verify.controller';
import { DnsService } from './dns.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [EmailVerifyService, DnsService],
  controllers: [EmailVerifyController],
})
export class EmailVerifyModule {}
