import { createReadStream, createWriteStream, mkdirSync } from 'fs';
import { rm, writeFile } from 'fs/promises';
import type { ObjectId } from 'mongodb';
import { Types } from 'mongoose';
import { Inject, Injectable } from '@nestjs/common';

import {
    AssetDriver,
    AssetUploadOpts,
    AssetUploadStream,
    LOCAL_DIR,
} from '../common';

@Injectable()
export class AssetLocalDriver implements AssetDriver {
    constructor(@Inject(LOCAL_DIR) protected dir: string) {}

    openUploadStream(filename: string, opts?: AssetUploadOpts) {
        const id = new Types.ObjectId();
        const dir = `${this.dir}/${id.toHexString()}`;
        mkdirSync(dir, { recursive: true });
        const ws = createWriteStream(
            `${dir}/file.bin`
        );
        const stream = ws as AssetUploadStream;
        stream.id = id;
        stream.done = false;
        stream.on('finish', () => {
            writeFile(`${dir}/filename.txt`, filename);
            writeFile(
                `${dir}/metadata.json`,
                JSON.stringify(opts?.metadata || {})
            );
            stream.done = true;
            stream.length = ws.bytesWritten;
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
