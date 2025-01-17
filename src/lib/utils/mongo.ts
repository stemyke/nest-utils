import { FilterQuery, HydratedDocument, model, Model, Query, Types, PipelineStage, Document } from 'mongoose';
import {getValue as getMongoValue, setValue as setMongoValue} from 'mongoose/lib/utils';

import { InferGeneric, IPagination, IPaginationParams } from '../common-types';
import { isFunction, isString } from './misc';
import { Type } from '@nestjs/common';

export function idToString(value: any): any {
    if (Array.isArray(value)) {
        return value.map(idToString);
    }
    return value instanceof Types.ObjectId
        ? value.toHexString()
        : isString(value)
        ? value
        : value || null;
}

export function compareId(a: Types.ObjectId | string, b: Types.ObjectId | string): boolean {
    return idToString(a) === idToString(b);
}

export async function setAndUpdate<T, D extends HydratedDocument<Partial<T>>>(doc: D, data: Partial<T>): Promise<D> {
    doc.set(data);
    await doc.save();
    return doc;
}

export function createTransformer<T = any>(transform?: (doc: HydratedDocument<T>, ret: any, options?: any) => any) {
    return (doc: HydratedDocument<T>, ret: any, options?: any) => {
        ret.id = idToString(ret.id) || ret.id;
        if (doc._id) {
            ret._id = idToString(doc._id);
            ret.id = ret.id || ret._id;
        }
        delete ret.__v;
        return isFunction(transform) ? transform(doc, ret, options) || ret : ret;
    };
}

export function hydratePopulated<T extends HydratedDocument<any>>(modelType: Model<T>, json: any): T {
    const object = modelType.hydrate(json);

    for (const [path, obj] of Object.entries(modelType.schema.obj)) {
        let ref = (obj as any).ref;
        const type = (obj as any).type;
        if (Array.isArray(type) && type.length > 0) {
            ref = type[0].ref;
        }
        if (!ref) continue;
        const value = getMongoValue(path, json);
        const hydrateVal = (val: any) => {
            if (val == null || val instanceof Types.ObjectId) return val;
            return hydratePopulated(model(ref) as any, val);
        };
        if (Array.isArray(value)) {
            setMongoValue(path, value.map(hydrateVal), object);
            continue;
        }
        setMongoValue(path, hydrateVal(value), object);
    }

    return object;

}

/**
 * Paginate using a Mongoose model using a simple where query and pagination params
 * @param model Mongoose model
 * @param where Simple query to filter the results
 * @param params Pagination params
 */
export async function paginate<T>(model: Model<T>, where: FilterQuery<HydratedDocument<T>>, params: IPaginationParams<T>): Promise<IPagination<HydratedDocument<T>>> {
    const count = await model.countDocuments(where);
    let query: Query<any, any> = model.find(where);
    if (isString(params.sort) && params.sort) {
        query = query.sort(params.sort);
    }
    if (Array.isArray(params.populate)) {
        params.populate.forEach(field => {
            query = query.populate(field);
        });
    }
    if (params.limit > 0) {
        query = query.skip(params.page * params.limit).limit(params.limit);
    }
    const items = await query;
    return {
        count,
        items,
        meta: {total: count}
    };
}

/**
 * Paginate using a Mongoose model using aggregation pipelines and pagination params
 * @param model Mongoose model
 * @param aggregations Aggregation pipeline stages
 * @param params Pagination params
 * @param metaProjection Pagination params
 */
export async function paginateAggregations<T>(model: Model<T>, aggregations: PipelineStage[], params: IPaginationParams<T>, metaProjection: any = {}): Promise<IPagination<HydratedDocument<T>>> {
    const sortField = !isString(params.sort) || !params.sort ? null : (params.sort.startsWith('-') ? params.sort.substring(1) : params.sort);
    const sortAggregation: PipelineStage.Sort[] = !sortField ? [] : [{
        $sort: {[sortField]: sortField == params.sort ? 1 : -1}
    }];
    const result = await model.aggregate([
        ...aggregations,
        ...sortAggregation,
        {
            $group: {
                _id: 'results',
                result: {$push: '$$CURRENT'}
            }
        },
        {
            $project: {
                _id: 0,
                items: params.limit > 0 ? {$slice: ['$result', params.page * params.limit, params.limit]} : '$result',
                count: {$size: '$result'},
                meta: {
                    total: {$size: '$result'},
                    ...metaProjection
                }
            }
        }
    ]);
    const pagination = result[0] as IPagination<HydratedDocument<T>>;
    if (!pagination) {
        return {items: [], count: 0, meta: {total: 0}};
    }
    pagination.items = pagination.items.map(i => hydratePopulated(model, i) as any);
    return pagination;
}
