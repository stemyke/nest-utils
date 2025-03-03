import { Connection } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Injectable } from '@nestjs/common';

import { IAssetDriver, IAssetUploadOpts } from '../common';

@Injectable()
export class AssetGridDriver implements IAssetDriver {
    protected bucket: GridFSBucket;

    constructor(connection: Connection, bucketName: string) {
        this.bucket = new GridFSBucket(connection.db, { bucketName });
    }

    openUploadStream(filename: string, opts?: IAssetUploadOpts) {
        return opts?.id
            ? this.bucket.openUploadStreamWithId(opts.id, filename, opts)
            : this.bucket.openUploadStream(filename, opts);
    }

    openDownloadStream(id: ObjectId) {
        return this.bucket.openDownloadStream(id);
    }

    delete(id: ObjectId) {
        return this.bucket.delete(id);
    }
}
