import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Readable } from 'stream';
import type { GridFSBucket, ObjectId, Filter, Collection } from 'mongodb';
import { GridFSBucket as BucketImpl } from 'mongodb/lib/gridfs';
import { Connection, Types } from 'mongoose';

import { IAsset, IAssetMeta, IFileType } from '../common-types';
import { copyStream, streamToBuffer, fileTypeFromBuffer, bufferToStream, fetchBuffer } from '../utils';
import { Asset } from '../entities/asset';
import { TempAsset } from '../entities/temp-asset';

export type PartialAsset = Partial<IAsset>;

@Injectable()
export class AssetsService {

    readonly bucket: GridFSBucket;
    readonly collection: Collection<PartialAsset>;

    constructor(@InjectConnection() connection: Connection) {
        this.bucket = new BucketImpl(connection.db, {bucketName: 'assets'});
        this.collection = connection.db.collection('assets');
    }

    async write(stream: Readable, contentType: string = null, metadata: IAssetMeta = null): Promise<IAsset> {
        const uploadStream = copyStream(stream);
        const buffer = await streamToBuffer(stream);
        let fileType = {ext: '', mime: contentType} as IFileType;
        try {
            fileType = await fileTypeFromBuffer(buffer);
        } catch (e) {
            if (!fileType.mime) {
                throw new Error(`Can't determine mime type: ${e}`);
            }
            console.log(`Can't determine mime type`, e);
        }
        metadata = metadata || {};
        return this.upload(uploadStream, fileType, metadata);
    }

    async writeBuffer(buffer: Buffer, metadata: IAssetMeta = null, contentType: string = null): Promise<IAsset> {
        let fileType = {ext: '', mime: contentType} as IFileType;
        try {
            fileType = await fileTypeFromBuffer(buffer);
        } catch (e) {
            if (!fileType.mime) {
                throw `Can't determine mime type`;
            }
            console.log(`Can't determine mime type`, e);
        }
        metadata = metadata || {};
        // buffer = await this.assetProcessor.process(buffer, metadata, fileType);
        return this.upload(bufferToStream(buffer), fileType, metadata);
    }

    async writeUrl(url: string, metadata: IAssetMeta = null): Promise<IAsset> {
        metadata = metadata || {};
        metadata.filename = metadata.filename || url;
        metadata.url = url;
        metadata.uploadTime = new Date().getTime();
        const oneWeek = 1000 * 3600 * 24 * 7;
        const asset = await this.find({'metadata.url': url, 'metadata.uploadTime': {$gt: metadata.uploadTime - oneWeek}});
        if (asset) return asset;
        const buffer = await fetchBuffer(url);
        return this.writeBuffer(buffer, metadata);
    }

    async download(url: string, contentType: string = null): Promise<IAsset> {
        let buffer = await fetchBuffer(url);
        let fileType = {ext: '', mime: contentType} as IFileType;
        try {
            fileType = await fileTypeFromBuffer(buffer);
        } catch (e) {
            if (!fileType.mime) {
                throw `Can't determine mime type`;
            }
            console.log(`Can't determine mime type`, e);
        }
        const metadata: IAssetMeta = {
            filename: url,
            extension: (fileType.ext || '').trim()
        };
        // buffer = await this.assetProcessor.process(buffer, metadata, fileType);
        return new TempAsset(buffer, url, fileType.mime, metadata);
    }

    async read(id: string): Promise<IAsset> {
        return !id ? null : this.find({_id: new Types.ObjectId(id)});
    }

    async find(where: Filter<PartialAsset>): Promise<IAsset> {
        const data = await this.collection.findOne(where);
        return !data ? null : new Asset(data._id, data, this.collection, this.bucket);
    }

    async findMany(where: Filter<IAsset>): Promise<ReadonlyArray<IAsset>> {
        const cursor = this.collection.find(where);
        const items = await cursor.toArray() || [];
        const result: IAsset[] = [];
        for (let item of items) {
            if (!item) continue;
            result.push(new Asset(item._id, item, this.collection, this.bucket));
        }
        return result;
    }

    async deleteMany(where: Filter<IAsset>): Promise<ReadonlyArray<string>> {
        const assets = await this.findMany(where);
        return Promise.all(assets.map(a => a.unlink()));
    }

    async unlink(id: string): Promise<any> {
        const asset = await this.read(id);
        if (!asset) return null;
        return asset.unlink();
    }

    protected async upload(stream: Readable, fileType: IFileType, metadata: IAssetMeta): Promise<IAsset> {
        const contentType = fileType.mime.trim();
        metadata = Object.assign({
            downloadCount: 0,
            firstDownload: null,
            lastDownload: null
        }, metadata || {});
        metadata.filename = metadata.filename || new Types.ObjectId().toHexString();
        metadata.extension = (fileType.ext || '').trim();
        return new Promise<IAsset>(((resolve, reject) => {
            const uploaderStream = this.bucket.openUploadStream(metadata.filename);
            stream.pipe(uploaderStream)
                .on('error', error => {
                    reject(error.message || error);
                })
                .on('finish', () => {
                    const asset = new Asset(uploaderStream.id as ObjectId, {
                        filename: metadata.filename,
                        contentType,
                        metadata
                    }, this.collection, this.bucket);
                    asset.save().then(() => {
                        resolve(asset);
                    }, error => {
                        reject(error.message || error);
                    });
                });
        }));
    }
}
