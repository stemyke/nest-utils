import { InjectionToken, Type } from '@nestjs/common';
import { Readable, Writable } from 'stream';
import type { ObjectId } from 'mongodb';
import { Connection } from 'mongoose';
import { FactoryToken, IFileType, IImageMeta, IImageParams } from '../common-types';

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

export interface IUploadFromUrlBody {
    url: string;
}

export interface IStreamableOptions {
    /**
     * The value that will be used for the `Content-Type` response header.
     * @default `"application/octet-stream"`
     */
    type?: string;
    /**
     * The value that will be used for the `Content-Disposition` response header.
     */
    disposition?: string;
    /**
     * The value that will be used for the `Content-Length` response header.
     */
    length?: number;
}

export interface IAssetMeta extends IImageMeta {
    filename?: string;
    extension?: string;
    length?: number;
    classified?: boolean;
    downloadCount?: number;
    firstDownload?: Date;
    lastDownload?: Date;
    preview?: ObjectId | string;
    publicUrl?: string;
    [prop: string]: any;
}

export interface IAsset {
    readonly oid: ObjectId;
    readonly id: string;
    readonly filename: string;
    readonly contentType: string;
    readonly createdAt: Date;
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
    id?: ObjectId;
    done?: boolean;
}

export interface IAssetUploadOpts {
    chunkSizeBytes?: number;
    contentType?: string;
    metadata?: IAssetMeta;
}

export interface IAssetDriver {
    openUploadStream(filename: string, opts?: IAssetUploadOpts): IAssetUploadStream;
    openDownloadStream(id: ObjectId): Readable;
    delete(id: ObjectId): Promise<void>;
}

export interface IAssetTypeDetector {
    detect(file: IUploadedFile): Promise<IFileType>;
}

export interface IAssetProcessor {
    process(buffer: Buffer, metadata: IAssetMeta, fileType: IFileType): Promise<Buffer>;
    preview(buffer: Buffer, metadata: IAssetMeta, fileType: IFileType): Promise<Buffer>;
}

export interface IAssetModuleOpts {
    // Local directory used to store files into when using AssetsLocalDriver
    localDir?: string;
    // Max file size in bytes
    maxSize?: number;
    // Type of asset driver
    driver?: Type<IAssetDriver>;
    // Type of asset type detector
    typeDetector?: Type<IAssetTypeDetector>;
    // Type of asset processor
    assetProcessor?: Type<IAssetProcessor>;
}

export const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];

export const videoTypes = ['video/mp4', 'video/webm', 'video/ogg'];

export const fontTypes = [
    'application/font-woff', 'application/font-woff2', 'application/x-font-opentype', 'application/x-font-truetype', 'application/x-font-datafork',
    'font/woff', 'font/woff2', 'font/otf', 'font/ttf', 'font/datafork'
];

export const fontProps = [
    'postscriptName', 'fullName', 'familyName', 'subfamilyName',
    'copyright', 'version', 'unitsPerEm', 'ascent', 'descent', 'lineGap',
    'underlinePosition', 'underlineThickness', 'italicAngle', 'capHeight',
    'xHeight', 'numGlyphs', 'characterSet', 'availableFeatures'
];

export const MAX_FILE_SIZE: FactoryToken<number> = Symbol.for('ASSET_MAX_FILE_SIZE');

export const LOCAL_DIR: FactoryToken<string> = Symbol.for('ASSET_LOCAL_DIR');

export const GRID_CONNECTION: FactoryToken<Connection> = Symbol.for('ASSET_GRID_CONNECTION');

export const ASSET_DRIVER: FactoryToken<IAssetDriver> = Symbol.for('ASSET_DRIVER');

export const ASSET_TYPE_DETECTOR: FactoryToken<IAssetTypeDetector> = Symbol.for('ASSET_TYPE_DETECTOR');

export const ASSET_PROCESSOR: FactoryToken<IAssetProcessor> = Symbol.for('ASSET_PROCESSOR');

export const ASSET_MODULE_OPTIONS: FactoryToken<IAssetModuleOpts> = Symbol.for('ASSET_MODULE_OPTIONS');
