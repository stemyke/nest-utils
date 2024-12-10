import { Type } from '@nestjs/common';
import { Types } from 'mongoose';
import { Readable, Writable } from 'stream';

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

export interface IImageCropInfo {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface IImageMeta {
    extension?: string;
    crop?: IImageCropInfo;
    cropBefore?: IImageCropInfo;
    cropAfter?: IImageCropInfo;
    canvasScaleX?: number;
    canvasScaleY?: number;
}

export interface IImageParams {
    rotation?: number;
    canvasScaleX?: number;
    canvasScaleY?: number;
    scaleX?: number;
    scaleY?: number;
    lazy?: boolean;
    crop?: string | boolean;
    cropBefore?: string | boolean | IImageCropInfo;
    cropAfter?: string | boolean | IImageCropInfo;
    [key: string]: any;
}

export interface IFileType {
    ext: string;
    mime: string;
}

export type FontFormat = "opentype" | "truetype" | "woff" | "woff2" | "datafork";
