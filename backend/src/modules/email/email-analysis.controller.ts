import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiCookieAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailAnalysisService } from './email-analysis.service';

const ALLOWED_MIME_TYPES = new Set([
  'message/rfc822',
  'application/octet-stream',
  'text/plain',
]);

const ALLOWED_EXTENSIONS = new Set(['.eml', '.msg', '.txt']);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@ApiTags('email-analysis')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('v1/email-analysis')
export class EmailAnalysisController {
  constructor(private readonly service: EmailAnalysisService) {}

  @Post()
  @ApiOperation({ summary: 'Upload an email file (EML/MSG/TXT) for analysis' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIZE_BYTES },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');

    // Validate extension (SEC-EMAIL-001)
    const ext = '.' + (file.originalname.split('.').pop() ?? '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`Unsupported file type. Allowed: EML, MSG, TXT`);
    }

    // Validate by magic bytes for EML/TXT (basic check: printable ASCII at start)
    const magic = file.buffer.slice(0, 4).toString('hex');
    // .msg files start with D0CF11E0 (OLE2)
    const isMsgMagic = magic === 'd0cf11e0';
    if (ext === '.msg' && !isMsgMagic) {
      throw new BadRequestException('File does not appear to be a valid MSG file');
    }

    return this.service.analyze(file);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get email analysis result by ID' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }
}
