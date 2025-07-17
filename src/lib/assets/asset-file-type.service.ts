import { Injectable } from '@nestjs/common';
import { fileTypeFromBuffer, FileTypeResult } from 'file-type';
import { AssetTypeDetector } from './common';

@Injectable()
export class AssetFileTypeService implements AssetTypeDetector {
    async detect(buffer: Buffer): Promise<FileTypeResult> {
        return fileTypeFromBuffer(buffer);
    }
}
