import { Readable, Writable } from 'stream';
import { Types } from 'mongoose';
import { IImageMeta, IImageParams } from '../common-types';
import { isString } from '../utils';

export const LOCAL_DIR = Symbol.for('ASSET_LOCAL_DIR');

export const ASSET_DRIVER = Symbol.for('ASSET_DRIVER');

export interface IUploadedFile {
    /** Name of the form field associated with this file. */
    fieldname: string;
    /** Name of the file on the uploader's computer. */
    originalname: string;
    /** Value of the `Content-Type` header for this file. */
    mimetype: string;
    /** Size of the file in bytes. */
    size: number;
    /**
     * A readable stream of this file. Only available to the `_handleFile`
     * callback for custom `StorageEngine`s.
     */
    stream: Readable;
    /** `DiskStorage` only: Directory to which this file has been uploaded. */
    destination: string;
    /** `DiskStorage` only: Name of this file within `destination`. */
    filename: string;
    /** `DiskStorage` only: Full path to the uploaded file. */
    path: string;
    /** `MemoryStorage` only: A Buffer containing the entire file. */
    buffer: Buffer;
}

export interface IAssetMeta extends IImageMeta {
    filename?: string;
    extension?: string;
    classified?: boolean;
    downloadCount?: number;
    firstDownload?: Date;
    lastDownload?: Date;
    [prop: string]: any;
}

export interface IAsset {
    readonly oid: Types.ObjectId;
    readonly id: string;
    readonly filename: string;
    readonly contentType: string;
    readonly metadata: IAssetMeta;
    readonly stream: Readable;
    unlink(): Promise<string>;
    setMeta(meta: Partial<IAssetMeta>): Promise<any>;
    getBuffer(): Promise<Buffer>;
    download(metadata?: IAssetMeta): Promise<Readable>;
    downloadImage(params?: IImageParams, metadata?: IAssetMeta): Promise<Readable>;
    getImage(params?: IImageParams): Promise<Readable>;
    save(): Promise<any>;
    load(): Promise<this>;
    toJSON(): any;
}

export interface IAssetUploadStream extends Writable {
    id?: Types.ObjectId;
    done?: boolean;
}

export interface IAssetUploadOpts {
    chunkSizeBytes?: number;
    metadata?: IAssetMeta;
}

export interface IAssetDriver {
    readonly metaCollection: string;
    openUploadStream(filename: string, opts?: IAssetUploadOpts): IAssetUploadStream;
    openDownloadStream(id: Types.ObjectId): Readable;
    delete(id: Types.ObjectId): Promise<void>;
}

export interface IAssetModuleOpts {
    driver?: 'local' | 'grid';
    localDir?: string;
}
