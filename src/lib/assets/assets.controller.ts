import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    Get,
    NotFoundException,
    Param,
    Post,
    Query,
    StreamableFile,
    UploadedFile,
    UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Readable } from 'stream';
import { isValidObjectId } from 'mongoose';

import { IAsset, IUploadedFile } from '../common-types';
import { Public } from '../decorators';

import { AssetImageParams } from './asset-image-params';
import { AssetsService } from './assets.service';
import { AssetResolverService } from './asset-resolver.service';

@Controller('assets')
export class AssetsController {

    constructor(readonly assets: AssetsService, readonly assetResolver: AssetResolverService) {

    }

    @Post('')
    @UseInterceptors(FileInterceptor('file'))
    async upload(@UploadedFile('file') file: IUploadedFile) {
        try {
            const contentType = file.mimetype === 'application/octet-stream' ? null : file.mimetype;
            const asset = await this.assets.writeBuffer(file.buffer, {filename: file.filename}, contentType);
            return asset.toJSON();
        } catch (e) {
            const msg = e?.message || e || 'Unknown error';
            throw new BadRequestException(`Asset can't be uploaded.\n${msg}`);
        }
    }

    @Post('url')
    async uploadUrl(@Body() body: any) {
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
    async getFile(@Param('id') id: string, @Query('lazy') lazy: boolean) {
        const asset = await this.getAsset('Asset', id, lazy);
        return this.streamResponse(asset.download(), asset);
    }

    @Public()
    @Get('/by-name/:name')
    async getFileByName(@Param('name') name: string) {
        const asset = await this.getAssetByName('Asset', name);
        return this.streamResponse(asset.download(), asset);
    }

    @Public()
    @Get('/image/:id/:rotation')
    async getImageRotation(@Param('id') id: string, @Query() params: AssetImageParams, @Param('rotation') rotation: number = 0) {
        const asset = await this.getAsset('Image', id, params.lazy);
        if (rotation !== 0) {
            params.rotation = params.rotation || rotation;
        }
        return this.streamResponse(asset.downloadImage(params), asset);
    }

    @Public()
    @Get('/image/:id')
    async getImage(@Param('id') id: string, @Query() params: AssetImageParams) {
        return this.getImageRotation(id, params);
    }

    @Public()
    @Get('/image/by-name/:name')
    async getImageByName(@Param('name') name: string, @Query() params: AssetImageParams) {
        const asset = await this.getAssetByName('Image', name);
        return this.streamResponse(asset.downloadImage(params), asset);
    }

    @Public()
    @Get('/metadata/:id')
    async getMetadata(@Param('id') id: string, @Query('lazy') lazy: boolean): Promise<any> {
        const asset = await this.assetResolver.resolve(id, lazy);
        if (!asset) {
            throw new BadRequestException(`Asset with id: '${id}' not found.`);
        }
        return asset.metadata;
    }

    protected async getAsset(type: string, id: string, lazy: boolean): Promise<IAsset> {
        if (!isValidObjectId(id)) {
            throw new BadRequestException(`Invalid object id provided: ${id}`);
        }
        const asset = await this.assetResolver.resolve(id, lazy);
        if (!asset) {
            throw new BadRequestException(`${type} with id: '${id}' not found.`);
        }
        if (asset.metadata?.classified) {
            throw new ForbiddenException(`${type} is classified, and can be only downloaded from a custom url.`);
        }
        return asset;
    }

    protected async getAssetByName(type: string, filename: string): Promise<IAsset> {
        const asset = await this.assets.find({filename});
        if (!asset) {
            throw new NotFoundException(`${type} with filename: '${filename}' not found.`);
        }
        if (asset.metadata?.classified) {
            throw new ForbiddenException(`${type} is classified, and can be only downloaded from a custom url.`);
        }
        return asset;
    }

    protected async streamResponse(promise: Promise<Readable>, asset: IAsset): Promise<StreamableFile> {
        const stream = await promise;
        const ext = asset.metadata?.extension;
        // console.log(`sending streamable file`, typeof stream, {
        //     disposition: !ext ? null : `inline; filename=${asset.filename}.${ext}`,
        //     type: asset.contentType
        // });
        return new StreamableFile(stream, {
            disposition: !ext ? null : `inline; filename=${asset.filename}.${ext}`,
            type: asset.contentType
        });
    }
}
