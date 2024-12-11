import { Readable } from 'stream';
import type { ObjectId } from 'mongodb';
import { Types } from 'mongoose';
import { IImageParams } from '../../common-types';
import { bufferToStream, toImage } from '../../utils';
import { IAsset, IAssetMeta } from '../common';

export class TempAsset implements IAsset {

    readonly oid: ObjectId;
    readonly id: string;

    get stream(): Readable {
        return bufferToStream(this.buffer);
    }

    constructor(protected buffer: Buffer, readonly filename: string, readonly contentType: string, readonly metadata: IAssetMeta) {
        this.oid = new Types.ObjectId();
        this.id = this.oid.toHexString();
    }

    async unlink(): Promise<string> {
        throw new Error(`Temp asset '${this.id}' can not be removed!`);
    }

    async setMeta(meta: Partial<IAssetMeta>): Promise<any> {
        Object.assign(this.metadata, meta || {});
    }

    async getBuffer(): Promise<Buffer> {
        return this.buffer;
    }

    async download(metadata?: IAssetMeta): Promise<Readable> {
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
