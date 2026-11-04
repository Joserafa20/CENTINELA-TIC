import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FileAnalysisService } from './file-analysis.service';
import { FileAnalysisController } from './file-analysis.controller';
import { MagicBytesService } from './magic-bytes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'file-analysis' }),
    PrismaModule,
  ],
  providers: [FileAnalysisService, MagicBytesService],
  controllers: [FileAnalysisController],
})
export class FileAnalysisModule {}
