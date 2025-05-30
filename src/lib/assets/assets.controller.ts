import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    Get,
    Inject,
    NotFoundException,
    Param,
    Post,
    Query,
    StreamableFile,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Readable } from 'stream';
import { isValidObjectId } from 'mongoose';

import { Public } from '../decorators';
import { fileTypeFromBuffer, formatSize } from '../utils';

import {
    ASSET_PROCESSOR,
    IAsset,
    IAssetMeta,
    IAssetProcessor,
    IUploadedFile,
    IUploadFromUrlBody,
    MAX_FILE_SIZE,
} from './common';
import { AssetImageParams } from './asset-image-params';
import { AssetsService } from './assets.service';
import { AssetResolverService } from './asset-resolver.service';
import { SeekableInterceptor } from './interceptors';
import { diskStorage } from 'multer';
import { IFileType } from '../common-types';
import { createReadStream } from 'fs';

type AssetReqType = 'Image' | 'Preview' | 'Asset';

@Controller('assets')
@UseInterceptors(SeekableInterceptor)
export class AssetsController {
    constructor(
        @Inject(MAX_FILE_SIZE) readonly maxFileSize: number,
        @Inject(ASSET_PROCESSOR) readonly assetProcessor: IAssetProcessor,
        readonly assets: AssetsService,
        readonly assetResolver: AssetResolverService
    ) {}

    @Post('')
    @UseInterceptors(FileInterceptor('file', {storage: diskStorage({})}))
    async upload(@UploadedFile('file') file: IUploadedFile) {
        try {
            if (file.size > this.maxFileSize) {
                throw new Error(
                    `File size exceeds the max limit of '${formatSize(
                        this.maxFileSize
                    )}' by: ${formatSize(file.size - this.maxFileSize)}`
                );
            }
            const meta = { filename: file.filename } as IAssetMeta;
            const fileType: IFileType = {
                ext: file.originalname.split('.').pop(),
                mime: file.mimetype
            };
            file = await this.assetProcessor.process(file, meta, fileType);
            await this.generatePreview(file, meta, fileType);
            const asset = await this.assets.write(createReadStream(file.path), meta, fileType);
            return asset.toJSON();
        } catch (e) {
            const msg = e?.message || e || 'Unknown error';
            throw new BadRequestException(`Asset can't be uploaded: ${msg}`);
        }
    }

    @Post('url')
    async uploadUrl(@Body() body: IUploadFromUrlBody) {
        try {
            const asset = await this.assets.writeUrl(body.url, body);
            return asset.toJSON();
        } catch (e) {
            const msg = e?.message || e || 'Unknown error';
            throw new BadRequestException(`Asset can't be uploaded.\n${msg}`);
        }
    }

    @Public()
    @Get('/:id')
    async getFile(@Param('id') id: string, @Query('lazy') lazy: boolean, @Query('type') type: string) {
        const assetType: AssetReqType = type === 'preview' ? 'Preview' : 'Asset';
        const asset = await this.getAsset(assetType, id, lazy);
        return this.streamResponse(asset.download(), asset);
    }

    @Public()
    @Get('/by-name/:name')
    async getFileByName(@Param('name') name: string, @Query('type') type: string) {
        const assetType: AssetReqType = type === 'preview' ? 'Preview' : 'Asset';
        const asset = await this.getAssetByName(assetType, name);
        return this.streamResponse(asset.download(), asset);
    }

    @Public()
    @Get('/image/:id/:rotation')
    async getImageRotation(
        @Param('id') id: string,
        @Query() params: AssetImageParams,
        @Param('rotation') rotation: number
    ) {
        const asset = await this.getAsset('Image', id, params.lazy);
        if (rotation !== 0) {
            params.rotation = params.rotation || rotation;
        }
        return this.streamResponse(asset.downloadImage(params), asset);
    }

    @Public()
    @Get('/image/:id')
    async getImage(@Param('id') id: string, @Query() params: AssetImageParams) {
        return this.getImageRotation(id, params, 0);
    }

    @Public()
    @Get('/image/by-name/:name')
    async getImageByName(
        @Param('name') name: string,
        @Query() params: AssetImageParams
    ) {
        const asset = await this.getAssetByName('Image', name);
        return this.streamResponse(asset.downloadImage(params), asset);
    }

    @Public()
    @Get('/metadata/:id')
    async getMetadata(
        @Param('id') id: string,
        @Query('lazy') lazy: boolean
    ): Promise<any> {
        const asset = await this.assetResolver.resolve(id, lazy);
        if (!asset) {
            throw new BadRequestException(`Asset with id: '${id}' not found.`);
        }
        return asset.metadata;
    }

    protected async getAsset(
        type: AssetReqType,
        id: string,
        lazy: boolean
    ): Promise<IAsset> {
        if (!isValidObjectId(id)) {
            throw new BadRequestException(`Invalid object id provided: ${id}`);
        }
        const asset = await this.assetResolver.resolve(id, lazy);
        if (!asset) {
            throw new BadRequestException(
                `${type} with id: '${id}' not found.`
            );
        }
        return this.resolveFinalAsset(type, asset);
    }

    protected async getAssetByName(
        type: AssetReqType,
        filename: string
    ): Promise<IAsset> {
        const asset = await this.assets.find({ filename });
        if (!asset) {
            throw new NotFoundException(
                `${type} with filename: '${filename}' not found.`
            );
        }
        return this.resolveFinalAsset(type, asset);
    }

    protected async resolveFinalAsset(
        type: AssetReqType,
        asset: IAsset
    ): Promise<IAsset> {
        if (asset.metadata?.classified) {
            throw new ForbiddenException(
                `${type} is classified, and can be only downloaded from a custom url.`
            );
        }
        if ((type == 'Image' || type == 'Preview') && asset.metadata.preview) {
            return this.resolveFinalAsset(
                type,
                await this.assetResolver.resolve(asset.metadata.preview)
            );
        }
        return asset;
    }

    protected async streamResponse(
        promise: Promise<Readable>,
        asset: IAsset
    ): Promise<StreamableFile> {
        const stream = await promise;
        const ext = asset.metadata?.extension;
        return new StreamableFile(stream, {
            disposition: !ext
                ? null
                : `inline; filename=${asset.filename}.${ext}`,
            type: asset.contentType,
            length: asset.metadata.length,
        });
    }

    protected async generatePreview(file: IUploadedFile, metadata: IAssetMeta, fileType: IFileType): Promise<void> {
        const preview = await this.assetProcessor.preview(file, metadata, fileType);
        if (!preview) return;
        const previewType = await fileTypeFromBuffer(preview);
        const asset = await this.assets.writeBuffer(preview, {}, previewType);
        metadata.preview = asset?.oid;
    }
}
