import { Module } from '@nestjs/common';
import { UrlAnalysisService } from './url-analysis.service';
import { UrlAnalysisController } from './url-analysis.controller';
import { HttpProbeService } from './http-probe.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UrlAnalysisService, HttpProbeService],
  controllers: [UrlAnalysisController],
})
export class UrlAnalysisModule {}
