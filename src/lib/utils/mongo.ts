import {
    Connection,
    FilterQuery,
    HydratedDocument,
    Model,
    PipelineStage,
    Query,
    Types,
} from 'mongoose';
import {
    getValue as getMongoValue,
    setValue as setMongoValue,
} from 'mongoose/lib/utils';

import {
    IMatchField,
    IPagination,
    IPaginationParams,
    IProjectOptions,
    IUnwindOptions,
} from '../common-types';
import { isFunction, isObject, isString } from './misc';
import { escapeRegex, toKeywords } from './string';

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

export function getModelFromConn(connection: Connection, name: string): Model<any> {
    /* If this connection has a parent from `useDb()`, bubble up to parent's models */
    console.log(connection['_parent'], connection);
    if (connection.models[name] == null && connection['_parent'] != null) {
        return getModelFromConn(connection['_parent'], name);
    }
    return connection.model(name);
}

export function hydratePopulated<T extends HydratedDocument<any>>(model: Model<T>, json: any): T {
    const object = model.hydrate(json);

    for (const [path, obj] of Object.entries(model.schema.obj)) {
        let ref = (obj as any).ref;
        const type = (obj as any).type;
        if (Array.isArray(type) && type.length > 0) {
            ref = type[0].ref;
        }
        if (!ref) continue;
        const value = getMongoValue(path, json);
        const hydrateVal = (val: any) => {
            return !isObject(val) ? val : hydratePopulated(getModelFromConn(model.db, ref) as any, val);
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

/**
 * Creates a lookup stage for aggregation pipelines from some simple fields
 * @param from From which schema should we look up
 * @param localField local field that contains the id
 * @param as In which key should we place the looked up entr(y)/(ies)
 * @param foreignField The foreign field we should use to match the connected entries, _id by default
 * @param shouldUnwind Lookup results in multiple entries by default, if this is enabled then a single entry will be placed instead of an array
 */
export function lookupStages(from: string, localField: string, as: string = null, foreignField: string = "_id", shouldUnwind: boolean = true): [PipelineStage.Lookup, PipelineStage.Unwind] {
    as = as || localField.replace("Id", "");
    const stages: [PipelineStage.Lookup, PipelineStage.Unwind] = [
        {
            $lookup: {
                from,
                localField,
                foreignField,
                as
            }
        },
        {
            $unwind: {
                path: `$${as}`,
                preserveNullAndEmptyArrays: true
            }
        }
    ];
    if (!shouldUnwind) {
        stages.splice(1, 1);
    }
    return stages;
}

export function matchStage(match: FilterQuery<any>): PipelineStage.Match {
    return {$match: match};
}

export function matchField(field: string, filter: any, when: boolean): IMatchField {
    return {field, filter, when};
}

export function matchFieldStages(...fields: IMatchField[]): ReadonlyArray<PipelineStage.Match> {
    const match = {};
    fields.forEach(field => {
        if (field.when) {
            match[field.field] = field.filter;
        }
    });
    return Object.keys(match).length > 0 ? [matchStage(match)] : [];
}

export function projectStage(fields: IProjectOptions): PipelineStage.Project {
    return {$project: fields};
}

export function addFieldStage(fields: IProjectOptions): PipelineStage.AddFields {
    return {$addFields: fields};
}

export function unwindStage(fieldOrOpts: string | IUnwindOptions): PipelineStage.Unwind {
    return {$unwind: fieldOrOpts};
}

export function toRegexFilter(fields: Record<string, string>, filter: string): FilterQuery<any> {
    filter = toKeywords(filter).map(word => `(${escapeRegex(word)})`).join('|');
    const query = Object.entries(fields).reduce((res, [key, value]) => {
        res[key] = {
            $regex: toKeywords(value).map(word => `(${escapeRegex(word)})`).join('|'),
            $options: 'i'
        };
        return res;
    }, {} as FilterQuery<any>);
    query.$or = Object.keys(fields).map(field => {
        return {
            [field]: {
                $regex: filter,
                $options: 'i'
            }
        }
    });
    return query;
}
