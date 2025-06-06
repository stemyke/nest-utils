import {IsBoolean, IsOptional, Max, Min} from 'class-validator';
import {IImageParams} from '../common-types';

export class AssetImageParams implements IImageParams {

    @Min(-360)
    @Max(360)
    @IsOptional()
    rotation?: number = 0;

    @Min(0.0001)
    @IsOptional()
    canvasScaleX?: number = 1;

    @Min(0.0001)
    @IsOptional()
    canvasScaleY?: number = 1;

    @Min(0.0001)
    @IsOptional()
    scaleX?: number = 1;

    @Min(0.0001)
    @IsOptional()
    scaleY?: number = 1;

    @IsBoolean()
    @IsOptional()
    lazy?: boolean = false;

    @IsBoolean()
    @IsOptional()
    crop?: boolean = false;

    @IsBoolean()
    @IsOptional()
    cropBefore?: boolean = false;

    @IsBoolean()
    @IsOptional()
    cropAfter?: boolean = false;
}
