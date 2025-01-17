import { Query } from '@nestjs/common';
import { QueryPipe } from '../pipes';

export function ComplexQuery() {
    return Query(null, QueryPipe);
}

export function SimpleQuery(param: string) {
    return Query(param, QueryPipe);
}
