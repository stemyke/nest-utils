import { DynamicModule, Module, Provider } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';

import { IModuleOptionsProvider } from '../common-types';
import {
    createRootModule,
    createRootModuleAsync,
    FromOptionsProviders,
    tempPath,
} from '../utils';

import {
    IAssetDriver,
    IAssetDriverConfig,
    IAssetModuleOpts,
    MAX_FILE_SIZE,
    ASSET_DRIVERS,
    ASSET_MODULE_OPTIONS,
    ASSET_PROCESSOR,
    ASSET_TYPE_DETECTOR
} from './common';

import { AssetGridDriver, AssetLocalDriver } from './drivers';
import { SeekableInterceptor } from './interceptors';
import { AssetResolverService } from './asset-resolver.service';
import { AssetProcessorService } from './asset-processor.service';
import { AssetFileTypeService } from './asset-file-type.service';

import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { Connection } from 'mongoose';

function createProviders(extraProviders?: Provider[]): Provider[] {
    return new FromOptionsProviders(ASSET_MODULE_OPTIONS)
        .add(
            AssetResolverService,
            AssetsService,
            AssetFileTypeService,
            AssetProcessorService,
            SeekableInterceptor,
            ...(extraProviders || [])
        )
        .useValue(MAX_FILE_SIZE, (opts) =>
            isNaN(opts.maxSize) ? 100 * 1024 * 1024 : opts.maxSize
        )
        .useValue(ASSET_DRIVERS, async (opts, resolve) => {
            const drivers =
                opts.drivers ||
                ([
                    {
                        name: 'assets',
                        type: 'grid',
                    },
                ] as IAssetDriverConfig[]);
            const map = new Map<string, IAssetDriver>();
            const connection = (await resolve(
                getConnectionToken()
            )) as Connection;
            for (const config of drivers) {
                if (!config.name) {
                    throw new Error(`Asset driver config should have a name!`);
                }
                switch (config.type) {
                    case 'grid':
                        map.set(
                            config.name,
                            new AssetGridDriver(
                                connection,
                                config.path || 'assets'
                            )
                        );
                        break;
                    default:
                        map.set(
                            config.name,
                            new AssetLocalDriver(config.path || 'assets_files')
                        );
                }
            }
            map.set(
                'temp',
                new AssetLocalDriver(await tempPath('data', 'temp_files'))
            );
            return map;
        })
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
