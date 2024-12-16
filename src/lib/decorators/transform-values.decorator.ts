import { Transform } from 'class-transformer';
import { transformValues } from '../utils';

export function TransformValues(cb: (value: any) => any) {
    return Transform((p) => transformValues(p.value, cb));
}
