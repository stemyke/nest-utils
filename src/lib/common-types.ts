import {
    ClassProvider,
    ExistingProvider,
    FactoryProvider,
    Type,
} from '@nestjs/common';
import { Types } from 'mongoose';

// Use this to ensure return types
export type FactoryToken<R = any> = symbol & { __type?: R };

interface Func {
    apply(this: Callable, thisArg: any, argArray?: any): any;
    call(this: Callable, thisArg: any, ...argArray: any[]): any;

    prototype: any;
    readonly length: number;
}

export interface Callable extends Func {
    (...args: any[]): any;
}

export interface Constructor<T = Callable> extends Func {
    new (...args: any[]): T;
}

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

// --- Translations ---

export interface ITranslator {
    getDictionary(lang: string): Promise<void>;
    getTranslationSync(lang: string, key: string, params: any): string;
}

// --- Module configuration ---

export interface IModuleOptionsFactory<T> {
    createOptions(): Promise<T> | T;
}

export interface IModuleOptionsProvider<T extends AsyncOptions> {
    useExisting?: Type<IModuleOptionsFactory<T>>;
    useClass?: Type<IModuleOptionsFactory<T>>;
    useFactory?: (...args: any[]) => Promise<T> | T;
    inject?: any[];
}

export type AsyncOptions = Record<string, any>;

export type AsyncOptionsProvider<T extends AsyncOptions> = FactoryProvider<T>;

export type AsyncOptionsTypeProvider<T extends AsyncOptions> =
    ExistingProvider<IModuleOptionsFactory<T>> | ClassProvider<IModuleOptionsFactory<T>>;

export type AsyncProviders<T extends AsyncOptions> =
    [AsyncOptionsProvider<T>] | [AsyncOptionsProvider<T>, AsyncOptionsTypeProvider<T>];

export type FromOptionsFactory<T extends AsyncOptions, R = any> = (opts: T) => R | Promise<R>;
