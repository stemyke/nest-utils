import {
    ClassProvider,
    ExistingProvider,
    FactoryProvider,
    Type,
} from '@nestjs/common';
import { AnyExpression, Expression, Types } from 'mongoose';

// --- Mongo interfaces and types

export interface IMatchField {
    field: string;
    filter: any;
    when: boolean;
}

export interface IProjectOptions {
    [field: string]: AnyExpression | Expression | IProjectOptions;
}

export interface IUnwindOptions {
    path: string;
    includeArrayIndex?: string;
    preserveNullAndEmptyArrays?: boolean;
}

// Use this to ensure return types
export type FactoryToken<R = any> = symbol & { __type?: R };

export interface Func {
    apply(this: Callable, thisArg: any, argArray?: any): any;
    call(this: Callable, thisArg: any, ...argArray: any[]): any;

    prototype: any;
    readonly length: number;
}

export type InstanceToken = Type | string | symbol;

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

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// --- Pagination ---

export interface IPaginationParams<T> {
    page: number;
    limit: number;
    sort?: string;
    populate?: Array<KeysOfType<T, Types.ObjectId | Types.ObjectId[]>>;
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
    getTranslationSync(lang: string, key: string, params?: Record<string, any>): string;
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

export type FromOptionsInstanceResolve = (token: InstanceToken) => Promise<any>;

export type FromOptionsFactory<T extends AsyncOptions, R = any> = (opts: T, resolve: FromOptionsInstanceResolve)
    => R | Promise<R>;
