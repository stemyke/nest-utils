import { applyDecorators } from '@nestjs/common';
import {
    Validate,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { isObjectIdOrHexString, Types } from 'mongoose';
import { transformValues, validateValues } from '../utils';
import { AssetsService } from '../assets';

// Custom constraint class
@ValidatorConstraint({ async: false })
class AssetIdConstraint implements ValidatorConstraintInterface {

    constructor(protected assets: AssetsService) {
        console.log('Asset Id', assets);
    }

    validate(value: any, args?: ValidationArguments) {
        const bucket = String(args.constraints[0] || '');
        console.log(bucket)
        return validateValues(value, v => !v || isObjectIdOrHexString(v));
    }

    defaultMessage() {
        return `Specified value is not an ObjectId like string`;
    }
}

export function ToAssetId(bucket?: string) {
    return applyDecorators(
        Validate(AssetIdConstraint, [bucket]),
        Transform((p) => transformValues(p.value, v => new Types.ObjectId(v))),
    );
}
