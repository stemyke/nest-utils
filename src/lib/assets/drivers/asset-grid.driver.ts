import { Connection } from 'mongoose';
import type { GridFSBucket, ObjectId } from 'mongodb';
import { GridFSBucket as BucketImpl } from 'mongodb/lib/gridfs';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';

import { IAssetDriver, IAssetUploadOpts } from '../common';

@Injectable()
export class AssetGridDriver implements IAssetDriver {
    protected bucket: GridFSBucket;

    constructor(@InjectConnection() connection: Connection) {
        this.bucket = new BucketImpl(connection.db, { bucketName: 'assets' });
    }

    openUploadStream(filename: string, opts?: IAssetUploadOpts) {
        return this.bucket.openUploadStream(filename, opts);
    }

    openDownloadStream(id: ObjectId) {
        return this.bucket.openDownloadStream(id);
    }

    delete(id: ObjectId) {
        return this.bucket.delete(id);
    }
}
