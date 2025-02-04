import { applyDecorators } from '@nestjs/common';
import {
    Validate,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { isObjectIdOrHexString, Types } from 'mongoose';
import { transformValues, validateValues } from '../utils';

// Custom constraint class
@ValidatorConstraint({ async: false })
class ObjectIdConstraint implements ValidatorConstraintInterface {

    validate(value: any) {
        return validateValues(value, v => !v || isObjectIdOrHexString(v));
    }

    defaultMessage() {
        return `Specified value is not an ObjectId like string`;
    }
}

export function ToObjectId() {
    return applyDecorators(
        Validate(ObjectIdConstraint),
        Transform((p) => transformValues(p.value, v => new Types.ObjectId(v))),
    );
}
