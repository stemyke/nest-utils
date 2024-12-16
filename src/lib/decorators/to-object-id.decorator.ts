import { Transform } from 'class-transformer';
import { Types } from 'mongoose';
import { transformValues } from '../utils';

export function ToObjectId() {
    return Transform((p) => transformValues(p.value, v => new Types.ObjectId(v)));
}
