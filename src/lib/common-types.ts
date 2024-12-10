import { Type } from '@nestjs/common';
import { Types } from 'mongoose';
import { Readable } from 'stream';

export type InferGeneric<T> = T extends Type<infer B> ? B : never;

export type KeysOfType<T, W> = {
    [K in keyof T]: (K extends string ? (T[K] extends W ? K : never) : never);
}[keyof T];

export type OnlyOfType<T, W> = {
    [K in KeysOfType<T, K>]: T[K];
};

// --- Pagination ---

export interface IPaginationParams<T> {
    page: number;
    limit: number;
    sort?: string;
    populate?: Array<KeysOfType<T, Types.ObjectId>>;
    [key: string]: any;
}

export interface IPaginationMeta {
    total: number;
    [key: string]: any;
}

export interface IPagination<T = any> {
    count: number
    items: T[];
    meta?: IPaginationMeta;
}

// --- Assets ---

export interface IAssetCropInfo {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface IAssetMeta {
    filename?: string;
    extension?: string;
    classified?: boolean;
    downloadCount?: number;
    firstDownload?: Date;
    lastDownload?: Date;
    crop?: IAssetCropInfo;
    cropBefore?: IAssetCropInfo;
    cropAfter?: IAssetCropInfo;
    canvasScaleX?: number;
    canvasScaleY?: number;
    [prop: string]: any;
}

export interface IAssetImageParams {
    rotation?: number;
    canvasScaleX?: number;
    canvasScaleY?: number;
    scaleX?: number;
    scaleY?: number;
    lazy?: boolean;
    crop?: string | boolean;
    cropBefore?: string | boolean | IAssetCropInfo;
    cropAfter?: string | boolean | IAssetCropInfo;
    [key: string]: any;
}

export interface IAsset {
    readonly id: string;
    readonly filename: string;
    readonly contentType: string;
    readonly metadata: IAssetMeta;
    readonly stream: Readable;
    unlink(): Promise<string>;
    setMeta(meta: Partial<IAssetMeta>): Promise<any>;
    getBuffer(): Promise<Buffer>;
    download(metadata?: IAssetMeta): Promise<Readable>;
    downloadImage(params?: IAssetImageParams, metadata?: IAssetMeta): Promise<Readable>;
    getImage(params?: IAssetImageParams): Promise<Readable>;
    save(): Promise<any>;
    load(): Promise<this>;
    toJSON(): any;
}

export interface IFileType {
    ext: string;
    mime: string;
}
