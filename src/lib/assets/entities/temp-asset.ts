import { Readable } from 'stream';
import { Buffer } from 'buffer';
import type { ObjectId } from 'mongodb';
import { Types } from 'mongoose';
import { IImageParams } from '../../common-types';
import { bufferToStream, streamToBuffer, toImage } from '../../utils';
import { IAsset, IAssetDriver, IAssetMeta } from '../common';

export class TempAsset implements IAsset {

    readonly oid: ObjectId;
    readonly driver: IAssetDriver;
    readonly id: string;
    readonly createdAt: Date;

    get bucket(): string {
        return 'temp';
    }

    readonly stream: Readable

    protected buffer: Buffer;

    constructor(src: Readable | Buffer, readonly filename: string, readonly contentType: string, readonly metadata: IAssetMeta) {
        this.oid = new Types.ObjectId();
        this.driver = null;
        this.id = this.oid.toHexString();
        this.createdAt = new Date();
        this.stream = src instanceof Buffer
            ? bufferToStream(src) : src as Readable;
        this.buffer = src instanceof Buffer ? src : null;
    }

    async unlink(): Promise<string> {
        throw new Error(`Temp asset '${this.id}' can not be removed!`);
    }

    async setMeta(meta: Partial<IAssetMeta>): Promise<any> {
        Object.assign(this.metadata, meta || {});
    }

    async getBuffer(): Promise<Buffer> {
        this.buffer = this.buffer || await streamToBuffer(this.stream);
        return this.buffer;
    }

    async download(metadata?: IAssetMeta): Promise<Readable> {
        Object.assign(this.metadata, metadata || {});
        return this.stream;
    }

    downloadImage(params?: IImageParams, metadata?: IAssetMeta): Promise<Readable> {
        Object.assign(this.metadata, metadata || {});
        return toImage(this.stream, params, this.metadata);
    }

    getImage(params?: IImageParams): Promise<Readable> {
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
