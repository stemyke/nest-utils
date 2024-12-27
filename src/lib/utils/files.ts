import { Readable, ReadableOptions } from 'stream';
import { tmpdir } from 'os';
import { Buffer } from 'buffer';
import { createReadStream, realpathSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { randomUUID } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import Mimetics from 'mimetics';
import axios from 'axios';
import {
    IFileType,
    IImageCropInfo,
    IImageMeta,
    IImageParams,
} from '../common-types';
import { isBoolean, isInterface, isString } from './misc';
import type { Region } from 'sharp';
import sharp_ from 'sharp';

const sharp = sharp_;

export const tempDirectory = realpathSync(tmpdir());

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

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    _read() {

    }
}

const fileSizeNames = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

export function formatSize(size: number): string {
    let index = 0;
    while (size > 1024) {
        size /= 1024;
        index++;
    }
    return `${size.toFixed(2)} ${fileSizeNames[index]}`;
}

export async function tempPath(filePath: string) {
    const path = join(tempDirectory, randomUUID(), filePath);
    await mkdir(dirname(path), { recursive: true });
    return path;
}

export async function tempWrite(content: string | Buffer, filePath: string) {
    const path = await tempPath(filePath);
    await writeFile(path, content);
    return path;
}

export async function generateVideoThumbnail(buffer: Buffer) {
    const input = await tempWrite(buffer, 'video');
    const output = await tempPath('thumbnail.png');
    return new Promise<Readable>((resolve, reject) => {
        ffmpeg(input)
            .on('end', () => {
                resolve(createReadStream(output));
            })
            .on('error', (err) => {
                reject(err);
            })
            .thumbnail({
                timestamps: [1],
                folder: dirname(output),
                filename: basename(output)
            });
    });
}

export function copyStream(stream: Readable, opts?: ReadableOptions): Readable {
    return new ReadableStreamClone(stream, opts);
}

export async function fetchBuffer(url: string): Promise<Buffer> {
    const res = await axios.get(url, {responseType: 'arraybuffer'});
    return Buffer.from(res.data);
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

export function checkTextFileType(type: IFileType): boolean {
    return type.mime.indexOf("text") >= 0 || type.mime.indexOf("xml") >= 0;
}

export function fixTextFileType(type: IFileType, buffer: Buffer): IFileType {
    const text = buffer.toString("utf8");
    if (text.indexOf("<svg") >= 0) {
        return {ext: "svg", mime: "image/svg+xml"};
    }
    return type;
}

export async function fileTypeFromBuffer(buffer: Buffer): Promise<IFileType> {
    const mimetics = new Mimetics();
    const type: IFileType = await mimetics.parseAsync(buffer);
    if (!type) {
        throw new Error(`Can't determine file type of buffer`);
    }
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
