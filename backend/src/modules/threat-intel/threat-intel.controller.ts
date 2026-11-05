import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ThreatIntelService } from './threat-intel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('v1/threat-intel')
export class ThreatIntelController {
  constructor(private readonly service: ThreatIntelService) {}

  @Post('lookup')
  async lookup(@Body('ioc') ioc: string) {
    if (!ioc || typeof ioc !== 'string') {
      throw new BadRequestException('ioc field is required (hash, IP, domain, or URL)');
    }
    return this.service.lookup(ioc.trim());
  }
}
