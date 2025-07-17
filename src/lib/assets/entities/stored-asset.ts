import { Readable } from 'stream';
import type { Collection, ObjectId } from 'mongodb';

import { Asset, AssetDriver, AssetMeta } from '../common';
import { ImageParams } from '../../common-types';
import { isString, streamToBuffer, toImage } from '../../utils';

export class StoredAsset implements Asset {

    get filename(): string {
        return this.data.filename;
    }

    get contentType(): string {
        return this.data.contentType;
    }

    get createdAt(): Date {
        return this.data.createdAt;
    }

    get metadata(): AssetMeta {
        return this.data.metadata;
    }

    get stream(): Readable {
        return this.driver.openDownloadStream(this.oid);
    }

    get id(): string {
        return this.oid.toHexString();
    }

    protected deleted: boolean;

    constructor(readonly oid: ObjectId,
                protected data: Partial<Asset>,
                protected collection: Collection,
                protected driver: AssetDriver) {
        this.deleted = false;
    }

    async load(): Promise<this> {
        const res = await this.collection.findOne({_id: this.oid}) as any;
        this.deleted = !res;
        this.data = res || {};
        return this;
    }

    async save() {
        return this.collection.updateOne({_id: this.oid}, {$set: this.toJSON()}, {upsert: true});
    }

    async unlink() {
        try {
            await this.driver.delete(this.oid);
            await this.collection.deleteOne({_id: this.oid});
        } catch (error) {
            let err = error as any;
            if (error) {
                err = error.message || error || "";
                if (!isString(err) || !err.startsWith("FileNotFound")) {
                    throw err;
                }
            }
        }
        return this.id;
    }

    async setMeta(metadata: Partial<AssetMeta>) {
        metadata = Object.assign(this.metadata, metadata || {});
        await this.collection.updateOne({_id: this.oid}, {$set: {metadata}});
    }

    getBuffer(): Promise<Buffer> {
        return streamToBuffer(this.stream);
    }

    async download(metadata?: AssetMeta) {
        metadata = Object.assign(this.metadata, metadata || {});
        metadata.downloadCount = isNaN(metadata.downloadCount) || !metadata.firstDownload
            ? 1
            : metadata.downloadCount + 1;
        metadata.firstDownload = metadata.firstDownload || new Date();
        metadata.lastDownload = new Date();
        await this.collection.updateOne({_id: this.oid}, {$set: {metadata}});
        return this.stream;
    }

    async getImage(params: ImageParams = null) {
        return toImage(this.stream, params, this.metadata);
    }

    async downloadImage(params?: ImageParams, metadata?: AssetMeta) {
        return toImage(await this.download(metadata), params, this.metadata);
    }

    toJSON(): any {
        const ret = Object.assign({}, this.data) as any;
        delete ret._id;
        ret.id = this.id;
        ret.updatedAt = new Date();
        ret.createdAt = ret.createdAt || ret.updatedAt;
        return ret;
    }
}
