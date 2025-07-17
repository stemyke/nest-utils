import { Readable } from 'stream';
import { Buffer } from 'buffer';
import type { ObjectId } from 'mongodb';
import { Types } from 'mongoose';
import { ImageParams } from '../../common-types';
import { bufferToStream, streamToBuffer, toImage } from '../../utils';
import { Asset, AssetMeta } from '../common';

export class MemoryAsset implements Asset {

    readonly oid: ObjectId;
    readonly id: string;
    readonly createdAt: Date;
    readonly stream: Readable

    protected buffer: Buffer;

    constructor(src: Readable | Buffer, readonly filename: string, readonly contentType: string, readonly metadata: AssetMeta) {
        this.oid = new Types.ObjectId();
        this.id = this.oid.toHexString();
        this.createdAt = new Date();
        this.stream = src instanceof Buffer
            ? bufferToStream(src) : src as Readable;
        this.buffer = src instanceof Buffer ? src : null;
    }

    async unlink(): Promise<string> {
        throw new Error(`Temp asset '${this.id}' can not be removed!`);
    }

    async setMeta(meta: Partial<AssetMeta>): Promise<any> {
        Object.assign(this.metadata, meta || {});
    }

    async getBuffer(): Promise<Buffer> {
        this.buffer = this.buffer || await streamToBuffer(this.stream);
        return this.buffer;
    }

    async download(metadata?: AssetMeta): Promise<Readable> {
        Object.assign(this.metadata, metadata || {});
        return this.stream;
    }

    downloadImage(params?: ImageParams, metadata?: AssetMeta): Promise<Readable> {
        Object.assign(this.metadata, metadata || {});
        return toImage(this.stream, params, this.metadata);
    }

    getImage(params?: ImageParams): Promise<Readable> {
        return this.downloadImage(params);
    }

    async save(): Promise<any> {
        return this;
    }

    async load(): Promise<this> {
        return this;
    }

    toJSON(): any {
        return {
            id: this.id,
            filename: this.filename,
            contentType: this.contentType,
            metadata: this.metadata
        };
    }
}
