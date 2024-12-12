import { Buffer } from 'buffer';
import { Injectable } from '@nestjs/common';
import { IFileType } from '../common-types';
import { fileTypeFromBuffer } from '../utils';
import { IAssetTypeDetector } from './common';

@Injectable()
export class AssetFileTypeService implements IAssetTypeDetector {
    async detect(buffer: Buffer, contentType: string): Promise<IFileType> {
        let fileType = { ext: '', mime: contentType } as IFileType;
        try {
            fileType = await fileTypeFromBuffer(buffer);
        } catch (e) {
            if (!fileType.mime) {
                throw e;
            }
            console.log(`${e}`);
        }
        return fileType;
    }
}
