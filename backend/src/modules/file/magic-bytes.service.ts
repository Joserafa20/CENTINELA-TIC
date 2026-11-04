import { Injectable } from '@nestjs/common';

interface MagicEntry {
  mime: string;
  extensions: string[];
  signature: number[];
  offset?: number;
}

const MAGIC_TABLE: MagicEntry[] = [
  { mime: 'application/pdf', extensions: ['.pdf'], signature: [0x25, 0x50, 0x44, 0x46] },
  { mime: 'application/zip', extensions: ['.zip', '.docx', '.xlsx', '.pptx', '.jar', '.apk'], signature: [0x50, 0x4b, 0x03, 0x04] },
  { mime: 'application/zip', extensions: ['.zip'], signature: [0x50, 0x4b, 0x05, 0x06] }, // empty zip
  { mime: 'application/x-7z-compressed', extensions: ['.7z'], signature: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] },
  { mime: 'application/x-rar-compressed', extensions: ['.rar'], signature: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07] },
  { mime: 'application/x-dosexec', extensions: ['.exe', '.dll', '.sys', '.com'], signature: [0x4d, 0x5a] },
  { mime: 'application/vnd.ms-office', extensions: ['.doc', '.xls', '.ppt', '.msi', '.msg'], signature: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
  { mime: 'image/png', extensions: ['.png'], signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/jpeg', extensions: ['.jpg', '.jpeg'], signature: [0xff, 0xd8, 0xff] },
  { mime: 'image/gif', extensions: ['.gif'], signature: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'application/x-tar', extensions: ['.tar'], signature: [0x75, 0x73, 0x74, 0x61, 0x72], offset: 257 },
  { mime: 'application/gzip', extensions: ['.gz', '.tgz'], signature: [0x1f, 0x8b] },
  { mime: 'application/java-archive', extensions: ['.class'], signature: [0xca, 0xfe, 0xba, 0xbe] },
  { mime: 'application/x-shockwave-flash', extensions: ['.swf'], signature: [0x46, 0x57, 0x53] },
  { mime: 'application/x-shockwave-flash', extensions: ['.swf'], signature: [0x43, 0x57, 0x53] },
  { mime: 'text/rtf', extensions: ['.rtf'], signature: [0x7b, 0x5c, 0x72, 0x74, 0x66] },
  { mime: 'application/x-msdownload', extensions: ['.ps1', '.vbs', '.bat', '.cmd', '.js', '.jse', '.wsh', '.wsf', '.hta'], signature: [] },
];

export interface MagicResult {
  detectedMime: string;
  confidence: 'high' | 'low' | 'unknown';
  extensionMismatch: boolean;
  mismatchDetails: string | null;
}

@Injectable()
export class MagicBytesService {
  detect(buffer: Buffer, fileName: string): MagicResult {
    const ext = ('.' + (fileName.split('.').pop() ?? '')).toLowerCase();

    for (const entry of MAGIC_TABLE) {
      if (entry.signature.length === 0) continue;
      const offset = entry.offset ?? 0;
      if (buffer.length < offset + entry.signature.length) continue;

      const matches = entry.signature.every(
        (byte, i) => buffer[offset + i] === byte,
      );

      if (matches) {
        const mismatch = !entry.extensions.includes(ext) &&
          // ZIP-based formats share the ZIP magic — only flag genuine extension mismatches
          !(entry.mime === 'application/zip' && ['.docx', '.xlsx', '.pptx', '.jar', '.apk', '.zip'].includes(ext));

        return {
          detectedMime: entry.mime,
          confidence: 'high',
          extensionMismatch: mismatch,
          mismatchDetails: mismatch
            ? `File appears to be ${entry.mime} but has extension ${ext}`
            : null,
        };
      }
    }

    // No magic match — treat as unknown/text
    return {
      detectedMime: 'application/octet-stream',
      confidence: 'unknown',
      extensionMismatch: false,
      mismatchDetails: null,
    };
  }
}
