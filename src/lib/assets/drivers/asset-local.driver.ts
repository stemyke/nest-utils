import { createReadStream, createWriteStream, mkdirSync } from 'fs';
import { rm, writeFile } from 'fs/promises';
import type { ObjectId } from 'mongodb';
import { Types } from 'mongoose';

import { IAssetDriver, IAssetUploadOpts, IAssetUploadStream } from '../common';

export class AssetLocalDriver implements IAssetDriver {
    constructor(protected dir: string) {}

    openUploadStream(filename: string, opts?: IAssetUploadOpts) {
        const id = opts?.id || new Types.ObjectId();
        const dir = `${this.dir}/${id.toHexString()}`;
        mkdirSync(dir, { recursive: true });
        const stream = createWriteStream(
            `${dir}/file.bin`
        ) as IAssetUploadStream;
        stream.id = id;
        stream.done = false;
        stream.on('finish', () => {
            writeFile(`${dir}/filename.txt`, filename);
            writeFile(
                `${dir}/metadata.json`,
                JSON.stringify(opts?.metadata || {})
            );
            stream.done = true;
        });
        return stream;
    }

    openDownloadStream(id: ObjectId) {
        return createReadStream(`${this.dir}/${id.toHexString()}/file.bin`, {
            autoClose: true,
            emitClose: true,
        });
    }

    delete(id: ObjectId) {
        return rm(`${this.dir}/${id.toHexString()}`, {
            recursive: true,
            force: true,
        });
    }
}
