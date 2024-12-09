import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ASSET_DRIVER, ASSET_PROCESSOR, IAssetDriver, IAssetModuleOpts, LOCAL_DIR } from './common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AssetResolverService } from './asset-resolver.service';
import { AssetProcessorService } from './asset-processor.service';
import { AssetGridDriver, AssetLocalDriver } from './drivers';

export function createAssetProviders(opts?: IAssetModuleOpts): Provider[] {
    let driver: Type<IAssetDriver> = AssetLocalDriver;
    switch (opts?.driver) {
        case 'grid':
            driver = AssetGridDriver;
            break;
    }
    const processor= opts?.assetProcessor || AssetProcessorService;
    return [
        AssetsService,
        processor,
        driver,
        {
            provide: LOCAL_DIR,
            useValue: opts?.localDir || 'assets_files'
        },
        {
            provide: ASSET_DRIVER,
            useExisting: driver
        },
        {
            provide: ASSET_PROCESSOR,
            useExisting: processor
        }
    ];
}

const providers = [
    AssetResolverService
];

@Module({
    providers,
    exports: providers,
    controllers: [AssetsController],
    imports: [MongooseModule.forFeature()]
})
export class AssetsModule {
    static forRoot(opts?: IAssetModuleOpts): DynamicModule {
        const providers = createAssetProviders(opts);
        return {
            providers,
            exports: providers,
            module: AssetsModule,
            global: true
        };
    }
}
