import { Module } from '@nestjs/common';
import { EmailAnalysisController } from './email-analysis.controller';
import { EmailAnalysisService } from './email-analysis.service';
import { EmailParserService } from './email-parser.service';
import { IndicatorService } from './indicator.service';

@Module({
  controllers: [EmailAnalysisController],
  providers: [EmailAnalysisService, EmailParserService, IndicatorService],
})
export class EmailAnalysisModule {}
