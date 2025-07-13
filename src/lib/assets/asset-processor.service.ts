import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import fontKit_, { Font } from 'fontkit';
import type { FileTypeResult } from 'file-type';
import sharp_ from 'sharp';
import { FontFormat } from '../common-types';
import {
    fontProps,
    fontTypes,
    IAssetMeta,
    IAssetProcessor,
    imageTypes,
    IUploadedFile,
    videoTypes,
} from './common';
import { ffprobe, generateVideoThumbnail, streamToBuffer } from '../utils';
import { join } from 'path';

const sharp = sharp_;
const fontKit = fontKit_;

@Injectable()
export class AssetProcessorService implements IAssetProcessor {
    static extractFontFormat(font: Font): FontFormat {
        const name: string = font.constructor.name;
        const tag: string = font['directory'].tag;
        switch (name) {
            case 'TTFFont':
                return tag === 'OTTO' ? 'opentype' : 'truetype';
            case 'WOFF2Font':
                return 'woff2';
            case 'WOFFFont':
                return 'woff';
            case 'DFont':
                return 'datafork';
        }
        return null;
    }

    static isImage(contentType: string): boolean {
        return imageTypes.indexOf(contentType) >= 0;
    }

    static async copyImageMeta(
        file: IUploadedFile,
        metadata: IAssetMeta,
        fileType: FileTypeResult,
    ): Promise<IUploadedFile> {
        if (fileType.mime === 'image/svg+xml') {
            const content = await readFile(file.path, 'utf8');
            const match = /<svg([^<>]+)>/gi.exec(content);
            if (match && match.length > 1) {
                const attrs = match[1].match(/([a-z]+)='([^']+)'/gi);
                attrs.forEach((attr) => {
                    if (attr.length < 5) return;
                    const [name, value] = attr.split('=');
                    const val = value.replace(/'/gi, '') as any;
                    metadata[name] = isNaN(val) ? val : Number(val);
                });
                if (
                    metadata.viewBox &&
                    (isNaN(metadata.width) || isNaN(metadata.height))
                ) {
                    const parts = (metadata.viewBox as string).split(' ');
                    metadata.width = Number(parts[0]) + Number(parts[2]);
                    metadata.height = Number(parts[1]) + Number(parts[3]);
                }
                if (!isNaN(metadata.width) && !isNaN(metadata.height)) {
                    metadata.svgSize = {
                        x: metadata.width,
                        y: metadata.height,
                    };
                }
            }
            return file;
        }
        const path = join(
            file.destination,
            `${file.filename.replace(/\./, '-')}-conv.${fileType.ext}`,
        );
        const filename = path.replace(file.destination, '');
        const output = await sharp(file.path).rotate().toFile(path);
        Object.assign(metadata, output);
        if (fileType.mime === 'image/jpg' || fileType.mime === 'image/jpeg') {
            return { ...file, filename, path };
        }
        return file;
    }

    static isVideo(contentType: string): boolean {
        return videoTypes.indexOf(contentType) >= 0;
    }

    static async copyVideoMeta(
        file: IUploadedFile,
        metadata: IAssetMeta,
    ): Promise<IUploadedFile> {
        const info = await ffprobe(file.path);
        Object.assign(metadata, info);
        return file;
    }

    static isFont(contentType: string): boolean {
        return fontTypes.indexOf(contentType) >= 0;
    }

    static async copyFontMeta(
        file: IUploadedFile,
        metadata: IAssetMeta,
    ): Promise<IUploadedFile> {
        const font = (await fontKit.open(file.path)) as Font;
        metadata.format = AssetProcessorService.extractFontFormat(font);
        fontProps.forEach((prop) => {
            metadata[prop] = font[prop];
        });
        return file;
    }

    async process(
        file: IUploadedFile,
        metadata: IAssetMeta,
        fileType: FileTypeResult,
    ): Promise<IUploadedFile> {
        if (AssetProcessorService.isImage(fileType.mime)) {
            return await AssetProcessorService.copyImageMeta(
                file,
                metadata,
                fileType,
            );
        }
        if (AssetProcessorService.isVideo(fileType.mime)) {
            return await AssetProcessorService.copyVideoMeta(file, metadata);
        }
        if (AssetProcessorService.isFont(fileType.mime)) {
            return await AssetProcessorService.copyFontMeta(file, metadata);
        }
        return file;
    }

    async preview(
        file: IUploadedFile,
        metadata: IAssetMeta,
        fileType: FileTypeResult,
    ): Promise<Buffer> {
        if (AssetProcessorService.isVideo(fileType.mime)) {
            const thumbnail = await generateVideoThumbnail(file.path);
            return streamToBuffer(thumbnail);
        }
        return null;
    }
}
