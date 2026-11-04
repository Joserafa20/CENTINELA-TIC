import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FileAnalysisService } from './file-analysis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const ALLOWED_EXTENSIONS = [
  '.exe', '.dll', '.sys', '.com',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.rar', '.7z', '.tar', '.gz', '.tgz',
  '.js', '.vbs', '.ps1', '.bat', '.cmd', '.hta', '.wsf',
  '.jar', '.apk', '.swf',
  '.rtf', '.msg',
];

@UseGuards(JwtAuthGuard)
@Controller('v1/file-analysis')
export class FileAnalysisController {
  constructor(private readonly service: FileAnalysisService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
      fileFilter: (_req, file, cb) => {
        const ext = ('.' + (file.originalname.split('.').pop() ?? '')).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          return cb(new BadRequestException(`File type not supported: ${ext}`), false);
        }
        cb(null, true);
      },
    }),
  )
  async analyze(
    @UploadedFile() file: Express.Multer.File,
    @Body('password') password?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.service.analyze(file, password);
  }

  @Get(':id')
  async getResult(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }
}
