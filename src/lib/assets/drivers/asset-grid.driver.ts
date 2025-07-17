import { Connection } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';

import { AssetDriver, AssetUploadOpts } from '../common';

@Injectable()
export class AssetGridDriver implements AssetDriver {
    protected bucket: GridFSBucket;

    constructor(@InjectConnection() connection: Connection) {
        this.bucket = new GridFSBucket(connection.db, { bucketName: 'assets' });
        connection.db.collection(`assets.chunks`).createIndex({ files_id: 1, n: 1 }, { unique: true } );
        connection.db.collection(`assets.files`).createIndex({ filename: 1, uploadDate: 1 } );
    }

    openUploadStream(filename: string, opts?: AssetUploadOpts) {
        return this.bucket.openUploadStream(filename, opts);
    }

    openDownloadStream(id: ObjectId) {
        return this.bucket.openDownloadStream(id);
    }

    delete(id: ObjectId) {
        return this.bucket.delete(id);
    }
}
