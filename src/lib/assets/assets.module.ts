import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
    ASSET_DRIVER,
    ASSET_PROCESSOR,
    ASSET_TYPE_DETECTOR,
    IAssetDriver,
    IAssetModuleOpts,
    IAssetTypeDetector,
    LOCAL_DIR,
} from './common';

import { AssetLocalDriver } from './drivers';
import { SeekableInterceptor } from './interceptors';

import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AssetResolverService } from './asset-resolver.service';
import { AssetProcessorService } from './asset-processor.service';
import { AssetFileTypeService } from './asset-file-type.service';

export function createAssetProviders(opts?: IAssetModuleOpts): Provider[] {
    const driver: Type<IAssetDriver> = opts?.driver || AssetLocalDriver;
    const detector: Type<IAssetTypeDetector> =
        opts?.typeDetector || AssetFileTypeService;
    const processor = opts?.assetProcessor || AssetProcessorService;
    return [
        AssetsService,
        detector,
        processor,
        driver,
        {
            provide: LOCAL_DIR,
            useValue: opts?.localDir || 'assets_files',
        },
        {
            provide: ASSET_DRIVER,
            useExisting: driver,
        },
        {
            provide: ASSET_TYPE_DETECTOR,
            useExisting: detector,
        },
        {
            provide: ASSET_PROCESSOR,
            useExisting: processor,
        },
    ];
}

const providers = [
    AssetResolverService,
    SeekableInterceptor
];

@Module({
    providers,
    exports: providers,
    controllers: [AssetsController],
    imports: [MongooseModule.forFeature()],
})
export class AssetsModule {
    static forRoot(opts?: IAssetModuleOpts): DynamicModule {
        const providers = createAssetProviders(opts);
        return {
            providers,
            exports: providers,
            module: AssetsModule,
            global: true,
        };
    }
}
