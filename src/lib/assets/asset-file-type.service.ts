import { Injectable } from '@nestjs/common';
import { IFileType } from '../common-types';
import { fileTypeFromBuffer } from '../utils';
import { IAssetTypeDetector } from './common';

@Injectable()
export class AssetFileTypeService implements IAssetTypeDetector {
    async detect(buffer: Buffer): Promise<IFileType> {
        return fileTypeFromBuffer(buffer);
    }
}
