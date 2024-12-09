import { Type } from '@nestjs/common';
import { Types } from 'mongoose';

export type InferGeneric<T> = T extends Type<infer B> ? B : never;

export type KeysOfType<T, W> = {
    [K in keyof T]: (K extends string ? (T[K] extends W ? K : never) : never);
}[keyof T];

export type OnlyOfType<T, W> = {
    [K in KeysOfType<T, K>]: T[K];
};

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
