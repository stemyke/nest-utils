import { Connection, Types } from 'mongoose';
import type { GridFSBucket } from 'mongodb';
import { GridFSBucket as BucketImpl } from 'mongodb/lib/gridfs';
import { IAssetDriver, IAssetUploadOpts } from '../common-types';

export class AssetGridDriver implements IAssetDriver {
    readonly metaCollection: string;

    protected bucket: GridFSBucket;

    constructor(connection: Connection) {
        this.bucket = new BucketImpl(connection.db, {bucketName: 'assets'});
        this.metaCollection = "assets.files";
    }

    openUploadStream(filename: string, opts?: IAssetUploadOpts) {
        return this.bucket.openUploadStream(filename, opts);
    }

    openDownloadStream(id: Types.ObjectId) {
        return this.bucket.openDownloadStream(id);
    }

    delete(id: Types.ObjectId) {
        return this.bucket.delete(id);
    }
}
