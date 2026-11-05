import { Controller, Post, Get, Param, Body, UseGuards, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { UrlAnalysisService } from './url-analysis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('v1/url-analysis')
export class UrlAnalysisController {
  constructor(private readonly service: UrlAnalysisService) {}

  @Post()
  async analyze(@Body('url') url: string) {
    if (!url || typeof url !== 'string') {
      throw new BadRequestException('url field is required');
    }
    const trimmed = url.trim();
    // Ensure scheme is present
    const normalised = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return this.service.analyze(normalised);
  }

  @Get(':id')
  async getResult(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }
}
