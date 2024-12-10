import { FilterQuery, HydratedDocument, Model, Query, Types } from 'mongoose';

import { IPagination, IPaginationParams } from '../common-types';
import { isString, isFunction } from './misc';
import type { GridFSBucket } from 'mongodb';

export function idToString(value: any): any {
    if (Array.isArray(value)) {
        return value.map(idToString);
    }
    return value instanceof Types.ObjectId
        ? value.toHexString()
        : (isString(value) ? value : value || null);
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

/**
 * Paginate using a Mongoose model using a simple where query and pagination params
 * @param model Mongoose model
 * @param where Simple query to filter the results
 * @param params Pagination params
 */
export async function paginate<TRD>(model: Model<TRD>, where: FilterQuery<HydratedDocument<TRD>>, params: IPaginationParams<TRD>): Promise<IPagination<HydratedDocument<TRD>>> {
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
