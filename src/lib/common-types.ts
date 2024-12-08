import { Type } from '@nestjs/common';

export type InferGeneric<T> = T extends Type<infer B> ? B : never;

export interface IPaginationParams {
    page: number;
    limit: number;
    sort?: string;
    populate?: string[];
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
