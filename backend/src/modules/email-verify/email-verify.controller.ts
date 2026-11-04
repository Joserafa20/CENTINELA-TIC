import { Controller, Post, Get, Param, Body, UseGuards, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { EmailVerifyService } from './email-verify.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('v1/email-verify')
export class EmailVerifyController {
  constructor(private readonly service: EmailVerifyService) {}

  @Post()
  async verify(@Body('email') email: string) {
    if (!email || typeof email !== 'string') {
      throw new BadRequestException('email field is required');
    }
    return this.service.verify(email.trim().toLowerCase());
  }

  @Get(':id')
  async getResult(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }
}
