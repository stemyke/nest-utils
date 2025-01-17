import { ArgumentMetadata, Injectable, Logger, ValidationPipe } from '@nestjs/common';
import { isArray, isObject, isString } from '../utils';

@Injectable()
export class QueryPipe extends ValidationPipe {
    private readonly logger = new Logger(QueryPipe.name);

    constructor() {
        super({ transform: true });
    }

    async transform(value: any, metadata: ArgumentMetadata) {
        try {
            return await super.transform(this.parse(value), metadata);
        } catch (err) {
            this.logger.log(err);
            return value;
        }
    }

    parse(value: any): any {
        try {
            if (isString(value)) {
                return JSON.parse(value);
            }
            if (isObject(value)) {
                return Object.entries(value).reduce((res, [k, v]) => {
                    if (k === 'query') {
                        Object.assign(res, this.parse(v));
                        return res;
                    }
                    res[k] = v;
                    return res;
                }, {});
            }
            if (isArray(value)) {
                return value.map(v => {
                    return this.parse(v);
                });
            }
            return value;
        } catch (err) {
            return value;
        }
    }
}
