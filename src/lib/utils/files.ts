import { PassThrough, Readable, ReadableOptions } from 'stream';
import Mimetics from 'mimetics';
import fetch from 'node-fetch-cjs';
import { IImageCropInfo, IImageParams, IFileType, IImageMeta } from '../common-types';
import { isBoolean, isInterface, isString } from './misc';
import sharp_ from 'sharp';
import type {Region} from 'sharp';

const sharp = sharp_;

class ReadableStreamClone extends Readable {

    constructor(readableStream: Readable, opts?: ReadableOptions) {
        super(opts);
        readableStream?.on("data", chunk => {
            this.push(chunk);
        });
        readableStream?.on("end", () => {
            this.push(null);
        });
        readableStream?.on("close", () => {
            this.push(null);
        });
        readableStream?.on("error", err => {
            this.emit("error", err);
        });
    }

    _read(size: number) {

    }
}

export function copyStream(stream: Readable, opts?: ReadableOptions): Readable {
    return new ReadableStreamClone(stream, opts);
}

export async function fetchBuffer(url: string): Promise<Buffer> {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

export function bufferToStream(buffer: Buffer): Readable {
    return Readable.from(buffer);
}

export function streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const concat = [];
        stream.on('data', data => {
            concat.push(data);
        });
        stream.on('error', reject);
        stream.on('end', () => {
            resolve(Buffer.concat(concat));
        });
        stream.on('close', () => {
            resolve(Buffer.concat(concat));
        });
        stream.on('pause', () => console.log('pause'));
    })
}

function checkTextFileType(type: IFileType): boolean {
    return type.mime.indexOf("text") >= 0 || type.mime.indexOf("xml") >= 0;
}

function fixTextFileType(type: IFileType, buffer: Buffer): IFileType {
    const text = buffer.toString("utf8");
    if (text.indexOf("<svg") >= 0) {
        return {ext: "svg", mime: "image/svg+xml"};
    }
    return type;
}

export async function fileTypeFromBuffer(buffer: Buffer): Promise<IFileType> {
    const mimetics = new Mimetics();
    const type: IFileType = (await mimetics.parseAsync(buffer)) ?? {ext: 'txt', mime: 'text/plain'};
    if (checkTextFileType(type)) {
        return fixTextFileType(type, buffer);
    }
    return type;
}

export async function fileTypeFromStream(stream: Readable): Promise<IFileType> {
    const buffer = await streamToBuffer(stream);
    return fileTypeFromBuffer(buffer);
}

const cropInterface = {
    x: 'number',
    y: 'number',
    w: 'number',
    h: 'number'
};

function toCropRegion(cropInfo: string | boolean | IImageCropInfo): Region {
    let crop = cropInfo as IImageCropInfo;
    if (isString(cropInfo)) {
        try {
            crop = JSON.parse(cropInfo as string);
        } catch (e) {
            return null;
        }
    }
    if (!isInterface(crop, cropInterface)) return null;
    return {
        width: Math.round(crop.w),
        height: Math.round(crop.h),
        top: Math.round(crop.y),
        left: Math.round(crop.x)
    };
}

export async function toImage<T = Buffer | Readable>(src: T, params?: IImageParams, meta?: IImageMeta): Promise<T> {

    // Default params and meta
    params = params || {};
    meta = meta || {};

    // Get default crop info
    const crop = toCropRegion(meta.crop);

    // Return the src if there are no params and no default crop exists
    if (meta.extension === 'svg' || (Object.keys(params).length == 0 && !crop)) {
        return src;
    }

    // Parse params
    params.rotation = isNaN(params.rotation) ? 0 : Math.round(params.rotation / 90) * 90;
    params.canvasScaleX = isNaN(params.canvasScaleX) ? 1 : Number(params.canvasScaleX);
    params.canvasScaleY = isNaN(params.canvasScaleY) ? 1 : Number(params.canvasScaleY);
    params.scaleX = isNaN(params.scaleX) ? 1 : Number(params.scaleX);
    params.scaleY = isNaN(params.scaleY) ? 1 : Number(params.scaleY);
    params.crop = isBoolean(params.crop) ? params.crop : params.crop == 'true';

    let buffer = src instanceof Readable ? await streamToBuffer(src) : src as any;

    try {
        // Get crop info
        const cropBefore = toCropRegion(params.cropBefore || (params.crop ? meta.cropBefore : null));
        const cropAfter = toCropRegion(params.cropAfter || (params.crop ? meta.cropAfter : null));
        // Get metadata
        let img = sharp(buffer);
        let {width, height} = await img.metadata();
        // Crop before resize
        if (cropBefore) {
            width = cropBefore.width;
            height = cropBefore.height;
            img = img.extract(cropBefore);
        } else if (crop) {
            width = crop.width;
            height = crop.height;
            img = img.extract(crop);
        }
        // Resize canvas
        const canvasScaleX = meta?.canvasScaleX || 1;
        const canvasScaleY = meta?.canvasScaleY || 1;
        if (params.canvasScaleX !== canvasScaleX || params.canvasScaleY !== canvasScaleY) {
            width = Math.round(width * params.canvasScaleX);
            height = Math.round(height * params.canvasScaleY);
            img = img.resize({width, height, background: '#00000000', fit: 'contain'});
        }
        // Resize image
        if (params.scaleX !== 1 || params.scaleY !== 1) {
            width = Math.round(width * params.scaleX);
            height = Math.round(height * params.scaleY);
            img = img.resize({width, height, background: '#00000000', fit: 'fill'});
        }
        // Crop after resize
        if (cropAfter) {
            img = img.extract(cropAfter);
        }
        // Rotate
        if (params.rotation !== 0) {
            buffer = await img.toBuffer();
            img = sharp(buffer).rotate(params.rotation);
        }
        buffer = await img.toBuffer();
        src = src instanceof Readable ? bufferToStream(buffer) : buffer;
        return src;
    } catch (e) {
        console.log('Image conversion error', e);
        src = src instanceof Readable ? bufferToStream(buffer) : buffer;
        return src;
    }
}
