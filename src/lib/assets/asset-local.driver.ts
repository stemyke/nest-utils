import { createReadStream, createWriteStream, mkdirSync } from 'fs';
import { rm } from 'fs/promises';
import { Types } from 'mongoose';
import { IAssetDriver, IAssetUploadOpts, IAssetUploadStream } from '../common-types';
import { Readable } from 'stream';

export class AssetLocalDriver implements IAssetDriver {
    readonly metaCollection: string;

    constructor(protected dir: string) {
        this.metaCollection = "assets.local";
    }

    openUploadStream(filename: string, opts?: IAssetUploadOpts): IAssetUploadStream {
        const id = new Types.ObjectId();
        const dir = `${this.dir}/${id.toHexString()}`;
        mkdirSync(dir, { recursive: true });
        const stream = createWriteStream(`${dir}/file.bin`) as IAssetUploadStream;
        stream.id = id;
        stream.done = false;
        stream.on('finish', () => {
            stream.done = true;
        });
        return stream;
    }

    openDownloadStream(id: Types.ObjectId): Readable {
        return createReadStream(`${this.dir}/${id.toHexString()}/file.bin`);
    }

    delete(id: Types.ObjectId): Promise<void> {
        return rm(`${this.dir}/${id.toHexString()}`, { recursive: true, force: true });
    }
}
