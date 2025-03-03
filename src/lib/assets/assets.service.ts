import { Inject, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Readable } from 'stream';
import type { Collection, Filter, ObjectId } from 'mongodb';
import { Connection, Types } from 'mongoose';

import { IFileType } from '../common-types';
import {
    bufferToStream,
    fetchBuffer,
    fileTypeFromBuffer,
    streamToBuffer,
} from '../utils';

import {
    ASSET_DRIVERS,
    ASSET_PROCESSOR,
    IAsset,
    IAssetDriver,
    IAssetMeta,
    IAssetProcessor
} from './common';
import { Asset, TempAsset } from './entities';

export type PartialAsset = Partial<IAsset>;

@Injectable()
export class AssetsService {

    readonly collection: Collection<PartialAsset>;
    readonly defaultBucket: string;

    constructor(@InjectConnection() connection: Connection,
                @Inject(ASSET_DRIVERS) protected readonly drivers: Map<string, IAssetDriver>,
                @Inject(ASSET_PROCESSOR) protected readonly assetProcessor: IAssetProcessor) {
        this.collection = connection.db.collection("assets.metadata");
        this.defaultBucket = Array.from(this.drivers.keys()).shift();
    }

    async writeBuffer(buffer: Buffer, metadata: IAssetMeta = null, fileType: IFileType = null, bucket?: string): Promise<IAsset> {
        fileType = fileType ?? await fileTypeFromBuffer(buffer)
        metadata = metadata || {};
        buffer = await this.assetProcessor.process(buffer, metadata, fileType);
        await this.generatePreview(buffer, metadata, fileType, bucket);
        return this.upload(buffer, metadata, fileType, bucket);
    }

    async writeStream(stream: Readable, metadata: IAssetMeta = null, fileType: IFileType = null, bucket?: string): Promise<IAsset> {
        const buffer = await streamToBuffer(stream);
        return this.writeBuffer(buffer, metadata, fileType, bucket);
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
        let buffer = await fetchBuffer(url);
        const fileType = await fileTypeFromBuffer(buffer);
        const metadata: IAssetMeta = {
            filename: url,
            extension: (fileType.ext || '').trim()
        };
        buffer = await this.assetProcessor.process(buffer, metadata, fileType);
        return new TempAsset(buffer, url, fileType.mime, metadata);
    }

    async read(id: string | ObjectId): Promise<IAsset> {
        return !id ? null : this.find({_id: new Types.ObjectId(id)});
    }

    async move(id: string | ObjectId, bucket?: string): Promise<IAsset> {
        const asset = await this.read(id);
        if (!asset) return null;
        bucket = bucket || this.defaultBucket;
        if (asset.bucket === bucket) return null;
        const metadata = asset.metadata || {};
        metadata.preview = (await this.move(metadata.preview))?.oid;
        const movedAsset = await this.uploadStream(
            bucket,
            asset.stream,
            asset.contentType,
            metadata,
            asset.oid
        );
        await asset.driver.delete(asset.oid);
        return movedAsset;
    }

    async find(where: Filter<PartialAsset>): Promise<IAsset> {
        const data = await this.collection.findOne(where);
        if (!data) return null;
        const bucket = data.bucket || this.defaultBucket;
        if (!this.drivers.has(bucket)) {
            throw new Error(`Driver not found for bucket: '${bucket}'`);
        }
        return new Asset(data._id, this.drivers.get(bucket), data, this.collection);
    }

    async findMany(where: Filter<IAsset>): Promise<IAsset[]> {
        const cursor = this.collection.find(where);
        const items = await cursor.toArray() || [];
        const result: IAsset[] = [];
        for (const item of items) {
            if (!item) continue;
            const bucket = item.bucket || this.defaultBucket;
            if (!this.drivers.has(bucket)) {
                throw new Error(`Driver not found for bucket: '${bucket}'`);
            }
            result.push(new Asset(item._id, this.drivers.get(bucket), item, this.collection));
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

    protected async upload(buffer: Buffer, metadata: IAssetMeta, fileType: IFileType, bucket: string): Promise<IAsset> {
        const contentType = fileType.mime.trim();
        metadata = Object.assign({
            downloadCount: 0,
            firstDownload: null,
            lastDownload: null
        }, metadata || {});
        metadata.filename = metadata.filename || new Types.ObjectId().toHexString();
        metadata.length = buffer.byteLength;
        metadata.extension = (fileType.ext || '').trim();
        return this.uploadStream(bucket, buffer, contentType, metadata);
    }

    protected uploadStream(bucket: string, source: Buffer | Readable, contentType: string, metadata: IAssetMeta, id?: ObjectId): Promise<IAsset> {
        bucket = bucket || this.defaultBucket;
        if (!this.drivers.has(bucket)) {
            throw new Error(`Driver not found for bucket: '${bucket}'`);
        }
        const driver = this.drivers.get(bucket);
        const sourceStream = source instanceof Buffer ? bufferToStream(source) : source;
        return new Promise<IAsset>((resolve, reject) => {
            try {
                const uploadStream = driver.openUploadStream(metadata.filename, {
                    chunkSizeBytes: 1048576,
                    contentType,
                    metadata,
                    id
                });
                sourceStream.pipe(uploadStream)
                    .on('error', error => {
                        reject(error.message || error);
                    })
                    .on('finish', () => {
                        try {
                            const asset = new Asset(uploadStream.id as ObjectId, driver, {
                                filename: metadata.filename,
                                contentType,
                                metadata,
                                bucket
                            }, this.collection);
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

    protected async generatePreview(buffer: Buffer, metadata: IAssetMeta, fileType: IFileType, bucket: string): Promise<void> {
        let preview = await this.assetProcessor.preview(buffer, metadata, fileType);
        if (!preview) return;
        const previewMeta: IAssetMeta = {};
        const previewType = await fileTypeFromBuffer(buffer);
        preview = await this.assetProcessor.process(preview, previewMeta, previewType);
        const asset = await this.upload(preview, previewMeta, previewType, bucket);
        metadata.preview = asset?.oid;
    }
}
