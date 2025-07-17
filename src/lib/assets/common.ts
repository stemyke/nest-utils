import { Type } from '@nestjs/common';
import { Readable, Writable } from 'stream';
import type { ObjectId } from 'mongodb';
import type { FileTypeResult } from 'file-type';
import { FactoryToken, ImageMeta, ImageParams } from '../common-types';

export interface FileInfo {
    /** Name of the form field associated with this file. */
    fieldname: string;
    /** Name of the file on the uploader's computer. */
    originalname: string;
    /** Value of the `Content-Type` header for this file. */
    mimetype: string;
    /** Size of the file in bytes. */
    size: number;
    /** `DiskStorage` only: Directory to which this file has been uploaded. */
    destination: string;
    /** `DiskStorage` only: Name of this file within `destination`. */
    filename: string;
    /** `DiskStorage` only: Full path to the uploaded file. */
    path: string;
}

export interface UploadFromUrlBody {
    url: string;
}

export interface StreamableOptions {
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

export interface AssetMeta extends ImageMeta {
    filename?: string;
    extension?: string;
    length?: number;
    classified?: boolean;
    downloadCount?: number;
    firstDownload?: Date;
    lastDownload?: Date;
    preview?: ObjectId | string;
    /**
     * A public display URL if the used asset driver supports it (Like Amazon S3)
     */
    publicUrl?: string;
    /**
     * Width for image/video files
     */
    width?: number;
    /**
     * Height for image/video files
     */
    height?: number;
    /**
     * Video bitrate in bytes/s
     */
    bit_rate?: number;
    // Other props
    [prop: string]: any;
}

export interface Asset {
    readonly oid: ObjectId;
    readonly id: string;
    readonly filename: string;
    readonly contentType: string;
    readonly createdAt: Date;
    readonly metadata: AssetMeta;
    readonly stream: Readable;
    unlink(): Promise<string>;
    setMeta(meta: Partial<AssetMeta>): Promise<any>;
    getBuffer(): Promise<Buffer>;
    download(metadata?: AssetMeta): Promise<Readable>;
    downloadImage(
        params?: ImageParams,
        metadata?: AssetMeta,
    ): Promise<Readable>;
    getImage(params?: ImageParams): Promise<Readable>;
    save(): Promise<any>;
    load(): Promise<this>;
    toJSON(): any;
}

export interface AssetUploadStream extends Writable {
    id?: ObjectId;
    done?: boolean;
    length?: number;
}

export interface AssetUploadOpts {
    chunkSizeBytes?: number;
    contentType?: string;
    metadata?: AssetMeta;
}

export interface AssetDriver {
    openUploadStream(
        filename: string,
        opts?: AssetUploadOpts,
    ): AssetUploadStream;
    openDownloadStream(id: ObjectId): Readable;
    delete(id: ObjectId): Promise<void>;
}

export interface AssetTypeDetector {
    detect(buffer: Buffer): Promise<FileTypeResult>;
}

export interface AssetProcessor {
    process(
        file: FileInfo,
        metadata: AssetMeta,
        fileType: FileTypeResult,
    ): Promise<FileInfo>;
    preview(
        file: FileInfo,
        metadata: AssetMeta,
        fileType: FileTypeResult,
    ): Promise<Buffer>;
}

export interface AssetModuleOpts {
    // Local directory used to store files into when using AssetsLocalDriver
    localDir?: string;
    // Max file size in bytes
    maxSize?: number;
    // Type of asset driver
    driver?: Type<AssetDriver>;
    // Type of asset type detector
    typeDetector?: Type<AssetTypeDetector>;
    // Type of asset processor
    assetProcessor?: Type<AssetProcessor>;
}

export const imageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/svg+xml',
];

export const videoTypes = ['video/mp4', 'video/webm', 'video/ogg'];

export const fontTypes = [
    'application/font-woff',
    'application/font-woff2',
    'application/x-font-opentype',
    'application/x-font-truetype',
    'application/x-font-datafork',
    'font/woff',
    'font/woff2',
    'font/otf',
    'font/ttf',
    'font/datafork',
];

export const fontProps = [
    'postscriptName',
    'fullName',
    'familyName',
    'subfamilyName',
    'copyright',
    'version',
    'unitsPerEm',
    'ascent',
    'descent',
    'lineGap',
    'underlinePosition',
    'underlineThickness',
    'italicAngle',
    'capHeight',
    'xHeight',
    'numGlyphs',
    'characterSet',
    'availableFeatures',
];

export const MAX_FILE_SIZE: FactoryToken<number> = Symbol.for(
    'ASSET_MAX_FILE_SIZE',
);

export const LOCAL_DIR: FactoryToken<string> = Symbol.for('ASSET_LOCAL_DIR');

export const ASSET_DRIVER: FactoryToken<AssetDriver> =
    Symbol.for('ASSET_DRIVER');

export const ASSET_TYPE_DETECTOR: FactoryToken<AssetTypeDetector> = Symbol.for(
    'ASSET_TYPE_DETECTOR',
);

export const ASSET_PROCESSOR: FactoryToken<AssetProcessor> =
    Symbol.for('ASSET_PROCESSOR');

export const ASSET_MODULE_OPTIONS: FactoryToken<AssetModuleOpts> = Symbol.for(
    'ASSET_MODULE_OPTIONS',
);
