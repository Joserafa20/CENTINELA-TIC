import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PdfService } from './pdf.service';
import { CsvService } from './csv.service';

@Module({
  providers: [ReportsService, PdfService, CsvService],
  controllers: [ReportsController],
})
export class ReportsModule {}
