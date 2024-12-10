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
    Res,
    UploadedFile,
    UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Readable } from 'stream';
import { IAsset, IUploadedFile } from '../common-types';
import { AssetImageParams } from './asset-image-params';
import { AssetsService } from './assets.service';
import { AssetResolverService } from './asset-resolver.service';
import { Public } from '../decorators';

@Controller('assets')
export class AssetsController {

    constructor(readonly assets: AssetsService, readonly assetResolver: AssetResolverService) {

    }

    @Post('')
    @UseInterceptors(FileInterceptor('file'))
    async upload(@UploadedFile('file') file: IUploadedFile) {
        try {
            const contentType = file.mimetype === 'application/octet-stream' ? null : file.mimetype;
            console.log(contentType, file.filename);
            const asset = await this.assets.writeBuffer(file.buffer, {filename: file.filename}, contentType);
            console.log('success', file.filename);
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
    async getFile(@Param('id') id: string, @Query('lazy') lazy: boolean, @Res() res: Response): Promise<Readable> {
        const asset = await this.getAsset('Asset', id, lazy, res);
        return asset.download();
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

    @Public()
    @Get('/image/:id/:rotation')
    async getImageRotation(@Param('id') id: string, @Query() params: AssetImageParams, @Res() res: Response, @Param('rotation') rotation: number = 0): Promise<Readable> {
        const asset = await this.getAsset('Image', id, params.lazy, res);
        if (rotation !== 0) {
            params.rotation = params.rotation || rotation;
        }
        return asset.downloadImage(params);
    }

    @Public()
    @Get('/image/:id')
    async getImage(@Param('id') id: string, @Query() params: AssetImageParams, @Res() res: Response): Promise<Readable> {
        return this.getImageRotation(id, params, res);
    }

    @Public()
    @Get('/by-name/:name')
    async getFileByName(@Param('name') name: string, @Res() res: Response): Promise<Readable> {
        const asset = await this.getAssetByName('Asset', name, res);
        return asset.download();
    }

    @Public()
    @Get('/by-name/image/:name')
    async getImageByName(@Param('name') name: string, @Query() params: AssetImageParams, @Res() res: Response): Promise<Readable> {
        const asset = await this.getAssetByName('Image', name, res);
        return asset.downloadImage(params);
    }

    protected setAssetHeaders(type: string, asset: IAsset, res: Response): void {
        if (asset.metadata?.classified) {
            throw new ForbiddenException(`${type} is classified, and can be only downloaded from a custom url.`);
        }
        const ext = asset.metadata?.extension;
        if (ext) {
            res.header('content-disposition', `inline; filename=${asset.filename}.${ext}`);
        }
        if (asset.contentType) {
            res.header('content-type', asset.contentType);
        }
    }

    protected async getAsset(type: string, id: string, lazy: boolean, res: Response): Promise<IAsset> {
        const asset = await this.assetResolver.resolve(id, lazy);
        if (!asset) {
            throw new BadRequestException(`${type} with id: '${id}' not found.`);
        }
        this.setAssetHeaders(type, asset, res);
        return asset;
    }

    protected async getAssetByName(type: string, filename: string, res: Response): Promise<IAsset> {
        const asset = await this.assets.find({filename});
        if (!asset) {
            throw new NotFoundException(`${type} with filename: '${filename}' not found.`);
        }
        this.setAssetHeaders(type, asset, res);
        return asset;
    }
}
