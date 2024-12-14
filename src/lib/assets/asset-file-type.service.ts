import { Injectable } from '@nestjs/common';
import { IFileType } from '../common-types';
import { fileTypeFromBuffer } from '../utils';
import { IAssetTypeDetector, IUploadedFile } from './common';

@Injectable()
export class AssetFileTypeService implements IAssetTypeDetector {
    async detect(file: IUploadedFile): Promise<IFileType> {
        let fileType = {
            ext: file.originalname.split('.').pop(),
            mime: file.mimetype,
        } as IFileType;
        try {
            fileType = await fileTypeFromBuffer(file.buffer);
        } catch (e) {
            if (!fileType.mime) {
                throw e;
            }
            console.log(`${e}`);
        }
        return fileType;
    }
}
