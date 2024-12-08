import { FilterQuery, HydratedDocument, Model, Query, Types } from 'mongoose';

import { IPagination, IPaginationParams } from '../common-types';
import { isString, isFunction } from './misc';

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
 * Paginate using a typegoose model using a simple where query and pagination params
 * @param model Typegoose model
 * @param where Simple query to filter the results
 * @param params Pagination params
 */
export function paginate<TRD>(model: Model<TRD>, where: FilterQuery<HydratedDocument<TRD>>, params: IPaginationParams): Promise<IPagination<HydratedDocument<TRD>>> {
    return model.countDocuments(where).then(count => {
        let query: Query<any, any> = model.find(where);
        if (isString(params.sort) && params.sort) {
            query = query.sort(params.sort);
        }
        if (Array.isArray(params.populate)) {
            params.populate.forEach(field => {
                query = query.populate(field);
            });
        }
        return (params.limit > 0 ? query.skip(params.page * params.limit).limit(params.limit) : query).then(items => {
            const meta = {total: count};
            return {count, items, meta};
        });
    });
}
