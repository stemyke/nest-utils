import { Inject, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Collection, Filter, ObjectId } from 'mongodb';
import { Connection, Types } from 'mongoose';

import { IFileType } from '../common-types';
import { bufferToStream, fetchBuffer } from '../utils';

import {
    ASSET_DRIVER,
    ASSET_PROCESSOR,
    ASSET_TYPE_DETECTOR,
    IAsset,
    IAssetDriver,
    IAssetMeta,
    IAssetProcessor,
    IAssetTypeDetector,
} from './common';
import { Asset, TempAsset } from './entities';
import { Readable } from 'stream';

export type PartialAsset = Partial<IAsset>;

@Injectable()
export class AssetsService {

    readonly collection: Collection<PartialAsset>;

    constructor(@InjectConnection() connection: Connection,
                @Inject(ASSET_TYPE_DETECTOR) readonly typeDetector: IAssetTypeDetector,
                @Inject(ASSET_DRIVER) readonly driver: IAssetDriver,
                @Inject(ASSET_PROCESSOR) readonly assetProcessor: IAssetProcessor) {
        this.collection = connection.db.collection("assets.metadata");
    }

    async writeBuffer(buffer: Buffer, metadata: IAssetMeta = null, fileType: IFileType = null): Promise<IAsset> {
        fileType = fileType ?? await this.typeDetector.detect(buffer);
        metadata = metadata || {};
        return this.write(bufferToStream(buffer), metadata, fileType);
    }

    async write(stream: Readable, metadata: IAssetMeta, fileType: IFileType): Promise<IAsset> {
        const contentType = fileType.mime.trim();
        metadata = Object.assign({
            downloadCount: 0,
            firstDownload: null,
            lastDownload: null
        }, metadata || {});
        metadata.filename = metadata.filename || new Types.ObjectId().toHexString();
        metadata.extension = (fileType.ext || '').trim();
        return new Promise<IAsset>((resolve, reject) => {
            try {
                const uploaderStream = this.driver.openUploadStream(metadata.filename, {
                    chunkSizeBytes: 1048576,
                    contentType,
                    metadata
                });
                stream.pipe(uploaderStream)
                    .on('error', error => {
                        reject(error.message || error);
                    })
                    .on('finish', () => {
                        metadata.length = uploaderStream.length;
                        try {
                            const asset = new Asset(uploaderStream.id as ObjectId, {
                                filename: metadata.filename,
                                contentType,
                                metadata
                            }, this.collection, this.driver);
                            asset.save().then(() => {
                                resolve(asset);
                            }, error => {
                                reject(error.message || error);
                            });
                        } catch (e) {
                            reject(e);
                        }
                    });
            } catch (e) {
                reject(e);
            }
        });
    }

    async writeUrl(url: string, metadata: IAssetMeta = null, fileType: IFileType = null): Promise<IAsset> {
        metadata = metadata || {};
        metadata.filename = metadata.filename || url;
        metadata.url = url;
        metadata.uploadTime = new Date().getTime();
        const oneWeek = 1000 * 3600 * 24 * 7;
        const asset = await this.find({'metadata.url': url, 'metadata.uploadTime': {$gt: metadata.uploadTime - oneWeek}});
        if (asset) return asset;
        const buffer = await fetchBuffer(url);
        return this.writeBuffer(buffer, metadata, fileType);
    }

    async download(url: string): Promise<IAsset> {
        const buffer = await fetchBuffer(url);
        const fileType = await this.typeDetector.detect(buffer);
        const metadata: IAssetMeta = {
            filename: url,
            extension: (fileType.ext || '').trim()
        };
        return new TempAsset(buffer, url, fileType.mime, metadata);
    }

    async read(id: string | ObjectId): Promise<IAsset> {
        return !id ? null : this.find({_id: new Types.ObjectId(id)});
    }

    async find(where: Filter<PartialAsset>): Promise<IAsset> {
        const data = await this.collection.findOne(where);
        return !data ? null : new Asset(data._id, data, this.collection, this.driver);
    }

    async findMany(where: Filter<IAsset>): Promise<IAsset[]> {
        const cursor = this.collection.find(where);
        const items = await cursor.toArray() || [];
        const result: IAsset[] = [];
        for (const item of items) {
            if (!item) continue;
            result.push(new Asset(item._id, item, this.collection, this.driver));
        }
        return result;
    }

    async deleteMany(where: Filter<IAsset>): Promise<ReadonlyArray<string>> {
        const assets = await this.findMany(where);
        return Promise.all(assets.map(a => a.unlink()));
    }

    async unlink(id: string | ObjectId): Promise<any> {
        const asset = await this.read(id);
        if (!asset) return null;
        if (asset.metadata.preview) {
            await this.unlink(asset.metadata.preview);
        }
        return asset.unlink();
    }
}
