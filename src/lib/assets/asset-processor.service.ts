import { Injectable } from '@nestjs/common';
import fontKit_, { Font } from 'fontkit';
import sharp_ from 'sharp';
import { FontFormat, IFileType } from '../common-types';
import {
    fontProps,
    fontTypes,
    IAssetMeta,
    IAssetProcessor,
    imageTypes,
    videoTypes,
} from './common';
import { ffprobe, generateVideoThumbnail, streamToBuffer, tempWrite } from '../utils';

const sharp = sharp_;
const fontKit = fontKit_;

@Injectable()
export class AssetProcessorService implements IAssetProcessor {

    static extractFontFormat(font: Font): FontFormat {
        const name: string = font.constructor.name;
        const tag: string  = font['directory'].tag;
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

    static async copyImageMeta(buffer: Buffer, metadata: IAssetMeta, fileType: IFileType): Promise<Buffer> {
        if (fileType.mime === 'image/svg+xml') {
            const match = /<svg([^<>]+)>/gi.exec(buffer.toString('utf8'));
            if (match && match.length > 1) {
                const attrs = match[1].match(/([a-z]+)='([^']+)'/gi);
                attrs.forEach(attr => {
                    if (attr.length < 5) return;
                    const [name, value] = attr.split('=');
                    const val = value.replace(/'/gi, '') as any;
                    metadata[name] = isNaN(val) ? val : Number(val);
                });
                if (metadata.viewBox && (isNaN(metadata.width) || isNaN(metadata.height))) {
                    const parts = (metadata.viewBox as string).split(' ');
                    metadata.width = Number(parts[0]) + Number(parts[2]);
                    metadata.height = Number(parts[1]) + Number(parts[3]);
                }
                if (!isNaN(metadata.width) && !isNaN(metadata.height)) {
                    metadata.svgSize = {x: metadata.width, y: metadata.height};
                }
            }
            return buffer;
        }
        const output = await sharp(buffer).rotate().toBuffer({resolveWithObject: true});
        Object.assign(metadata, output.info);
        return output.data;
    }

    static isVideo(contentType: string): boolean {
        return videoTypes.indexOf(contentType) >= 0;
    }

    static async copyVideoMeta(buffer: Buffer, metadata: IAssetMeta): Promise<Buffer> {
        metadata.tempFfmpegPath = await tempWrite(buffer, 'video');
        const info = await ffprobe(metadata.tempFfmpegPath);
        Object.assign(metadata, info);
        return buffer;
    }

    static isFont(contentType: string): boolean {
        return fontTypes.indexOf(contentType) >= 0;
    }

    static copyFontMeta(buffer: Buffer, metadata: IAssetMeta): void {
        const font: Font = fontKit.create(buffer);
        metadata.format = AssetProcessorService.extractFontFormat(font);
        fontProps.forEach(prop => {
            metadata[prop] = font[prop];
        });
    }

    async process(buffer: Buffer, metadata: IAssetMeta, fileType: IFileType): Promise<Buffer> {
        if (AssetProcessorService.isImage(fileType.mime)) {
            buffer = await AssetProcessorService.copyImageMeta(buffer, metadata, fileType);
        }
        if (AssetProcessorService.isVideo(fileType.mime)) {
            buffer = await AssetProcessorService.copyVideoMeta(buffer, metadata);
        }
        if (AssetProcessorService.isFont(fileType.mime)) {
            AssetProcessorService.copyFontMeta(buffer, metadata);
        }
        return buffer;
    }

    async preview(buffer: Buffer, metadata: IAssetMeta, fileType: IFileType): Promise<Buffer> {
        if (AssetProcessorService.isVideo(fileType.mime)) {
            const thumbnail = await generateVideoThumbnail(metadata.tempFfmpegPath || buffer);
            return streamToBuffer(thumbnail);
        }
        return null;
    }
}
