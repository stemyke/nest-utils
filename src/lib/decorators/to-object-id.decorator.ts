import { applyDecorators } from '@nestjs/common';
import {
    Validate,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { isObjectIdOrHexString, Types } from 'mongoose';
import { validateValues } from '../utils';
import { TransformValues } from './transform-values.decorator';

// Custom constraint class
@ValidatorConstraint({ async: false })
class ObjectIdConstraint implements ValidatorConstraintInterface {
    validate(value: any) {
        return validateValues(value, (v) => !v || isObjectIdOrHexString(v));
    }

    defaultMessage() {
        return `Specified value is not an ObjectId like string`;
    }
}

export function ToObjectId() {
    return applyDecorators(
        Validate(ObjectIdConstraint),
        TransformValues((v) => new Types.ObjectId(v)),
    );
}
