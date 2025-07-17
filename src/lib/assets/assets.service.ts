import { Inject, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Collection, Filter, ObjectId } from 'mongodb';
import { Connection, Types } from 'mongoose';
import type { FileTypeResult } from 'file-type';

import { bufferToStream, fetchBuffer } from '../utils';

import {
    ASSET_DRIVER,
    ASSET_PROCESSOR,
    ASSET_TYPE_DETECTOR,
    Asset,
    AssetDriver,
    AssetMeta,
    AssetProcessor,
    AssetTypeDetector,
} from './common';
import { StoredAsset, MemoryAsset } from './entities';
import { Readable } from 'stream';

export type PartialAsset = Partial<Asset>;

@Injectable()
export class AssetsService {

    readonly collection: Collection<PartialAsset>;

    constructor(@InjectConnection() connection: Connection,
                @Inject(ASSET_TYPE_DETECTOR) readonly typeDetector: AssetTypeDetector,
                @Inject(ASSET_DRIVER) readonly driver: AssetDriver,
                @Inject(ASSET_PROCESSOR) readonly assetProcessor: AssetProcessor) {
        this.collection = connection.db.collection("assets.metadata");
    }

    async writeBuffer(buffer: Buffer, metadata: AssetMeta = null, fileType: FileTypeResult = null): Promise<Asset> {
        fileType = fileType ?? await this.typeDetector.detect(buffer);
        metadata = metadata || {};
        return this.write(bufferToStream(buffer), metadata, fileType);
    }

    async write(stream: Readable, metadata: AssetMeta, fileType: FileTypeResult): Promise<Asset> {
        const contentType = fileType.mime.trim();
        metadata = Object.assign({
            downloadCount: 0,
            firstDownload: null,
            lastDownload: null
        }, metadata || {});
        metadata.filename = metadata.filename || new Types.ObjectId().toHexString();
        metadata.extension = (fileType.ext || '').trim();
        return new Promise<Asset>((resolve, reject) => {
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
                            const asset = new StoredAsset(uploaderStream.id as ObjectId, {
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

    async writeUrl(url: string, metadata: AssetMeta = null, fileType: FileTypeResult = null): Promise<Asset> {
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

    async download(url: string): Promise<Asset> {
        const buffer = await fetchBuffer(url);
        const fileType = await this.typeDetector.detect(buffer);
        const metadata: AssetMeta = {
            filename: url,
            extension: (fileType.ext || '').trim()
        };
        return new MemoryAsset(buffer, url, fileType.mime, metadata);
    }

    async read(id: string | ObjectId): Promise<Asset> {
        return !id ? null : this.find({_id: new Types.ObjectId(id)});
    }

    async find(where: Filter<PartialAsset>): Promise<Asset> {
        const data = await this.collection.findOne(where);
        return !data ? null : new StoredAsset(data._id, data, this.collection, this.driver);
    }

    async findMany(where: Filter<Asset>): Promise<Asset[]> {
        const cursor = this.collection.find(where);
        const items = await cursor.toArray() || [];
        const result: Asset[] = [];
        for (const item of items) {
            if (!item) continue;
            result.push(new StoredAsset(item._id, item, this.collection, this.driver));
        }
        return result;
    }

    async deleteMany(where: Filter<Asset>): Promise<ReadonlyArray<string>> {
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
