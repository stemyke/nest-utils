import { Injectable } from '@nestjs/common';
import { fileTypeFromBuffer, FileTypeResult } from 'file-type';
import { IAssetTypeDetector } from './common';

@Injectable()
export class AssetFileTypeService implements IAssetTypeDetector {
    async detect(buffer: Buffer): Promise<FileTypeResult> {
        return fileTypeFromBuffer(buffer);
    }
}
