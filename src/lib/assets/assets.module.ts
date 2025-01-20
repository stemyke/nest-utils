import { DynamicModule, Module, Provider } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { IModuleOptionsProvider } from '../common-types';
import {
    createRootModule,
    createRootModuleAsync,
    FromOptionsProviders,
} from '../utils';

import {
    ASSET_DRIVER,
    ASSET_MODULE_OPTIONS,
    ASSET_PROCESSOR,
    ASSET_TYPE_DETECTOR,
    IAssetModuleOpts,
    LOCAL_DIR,
    MAX_FILE_SIZE,
} from './common';

import { AssetGridDriver, AssetLocalDriver } from './drivers';
import { SeekableInterceptor } from './interceptors';
import { AssetResolverService } from './asset-resolver.service';
import { AssetProcessorService } from './asset-processor.service';
import { AssetFileTypeService } from './asset-file-type.service';

import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

function createProviders(extraProviders?: Provider[]): Provider[] {
    return new FromOptionsProviders(ASSET_MODULE_OPTIONS)
        .add(
            AssetResolverService,
            AssetsService,
            AssetGridDriver,
            AssetLocalDriver,
            AssetFileTypeService,
            AssetProcessorService,
            SeekableInterceptor,
            ...(extraProviders || [])
        )
        .useValue(MAX_FILE_SIZE, (opts) =>
            isNaN(opts.maxSize) ? 100 * 1024 * 1024 : opts.maxSize
        )
        .useValue(LOCAL_DIR, (opts) => opts.localDir || 'assets_files')
        .useType(ASSET_DRIVER, (opts) => opts.driver || AssetLocalDriver)
        .useType(
            ASSET_TYPE_DETECTOR,
            (opts) => opts.typeDetector || AssetFileTypeService
        )
        .useType(
            ASSET_PROCESSOR,
            (opts) => opts.assetProcessor || AssetProcessorService
        )
        .asArray();
}

@Module({
    imports: [MongooseModule.forFeature()],
    controllers: [AssetsController],
})
export class AssetsModule {

    static forRoot(opts?: IAssetModuleOpts): DynamicModule {
        return createRootModule(
            AssetsModule,
            ASSET_MODULE_OPTIONS,
            opts,
            createProviders()
        )
    }

    static forRootAsync(opts: IModuleOptionsProvider<IAssetModuleOpts>,
                        ...extraProviders: Provider[]): DynamicModule {
        return createRootModuleAsync(
            AssetsModule,
            ASSET_MODULE_OPTIONS,
            opts,
            createProviders(extraProviders)
        )
    }
}
