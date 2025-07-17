import {
    ClassProvider,
    ExistingProvider,
    FactoryProvider,
    Type,
} from '@nestjs/common';
import { AnyExpression, Expression, Types } from 'mongoose';

// --- Mongo interfaces and types

export interface MatchField {
    field: string;
    filter: any;
    when: boolean;
}

export interface ProjectOptions {
    [field: string]: AnyExpression | Expression | ProjectOptions;
}

export interface UnwindOptions {
    path: string;
    includeArrayIndex?: string;
    preserveNullAndEmptyArrays?: boolean;
}

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

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// --- Pagination ---

export interface PaginationParams<T> {
    page: number;
    limit: number;
    sort?: string;
    populate?: Array<KeysOfType<T, Types.ObjectId | Types.ObjectId[]>>;
    [key: string]: any;
}

export interface PaginationMeta {
    total: number;
    [key: string]: any;
}

export interface PaginationData<T = any> {
    count: number
    items: T[];
    meta?: PaginationMeta;
}

// --- Assets ---

export interface ImageCropInfo {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface ImageMeta {
    extension?: string;
    crop?: ImageCropInfo;
    cropBefore?: ImageCropInfo;
    cropAfter?: ImageCropInfo;
    canvasScaleX?: number;
    canvasScaleY?: number;
}

export interface ImageParams {
    rotation?: number;
    canvasScaleX?: number;
    canvasScaleY?: number;
    scaleX?: number;
    scaleY?: number;
    lazy?: boolean;
    crop?: string | boolean;
    cropBefore?: string | boolean | ImageCropInfo;
    cropAfter?: string | boolean | ImageCropInfo;
    [key: string]: any;
}

export type FontFormat = "opentype" | "truetype" | "woff" | "woff2" | "datafork";

// --- Fixtures ---

export interface Fixture {
    load(output?: FixtureOutput): Promise<any>;
}

export interface FixtureOutput {
    write(message: string): void;
    writeln(message: string): void;
}

// --- Translations ---

export interface Translator {
    getDictionary(lang: string): Promise<void>;
    getTranslationSync(lang: string, key: string, params?: Record<string, any>): string;
}

// --- Module configuration ---

export interface ModuleOptionsFactory<T> {
    createOptions(): Promise<T> | T;
}

export interface ModuleOptionsProvider<T extends AsyncOptions> {
    useExisting?: Type<ModuleOptionsFactory<T>>;
    useClass?: Type<ModuleOptionsFactory<T>>;
    useFactory?: (...args: any[]) => Promise<T> | T;
    inject?: any[];
}

export type AsyncOptions = Record<string, any>;

export type AsyncOptionsProvider<T extends AsyncOptions> = FactoryProvider<T>;

export type AsyncOptionsTypeProvider<T extends AsyncOptions> =
    ExistingProvider<ModuleOptionsFactory<T>> | ClassProvider<ModuleOptionsFactory<T>>;

export type AsyncProviders<T extends AsyncOptions> =
    [AsyncOptionsProvider<T>] | [AsyncOptionsProvider<T>, AsyncOptionsTypeProvider<T>];

export type FromOptionsFactory<T extends AsyncOptions, R = any> = (opts: T) => R | Promise<R>;
