import {Module} from '@nestjs/common';
import {AssetsController} from './assets.controller';
import {AssetsService} from "./assets.service";
import { AssetResolverService } from './asset-resolver.service';

@Module({
    controllers: [AssetsController],
    providers: [AssetsService, AssetResolverService],
    exports: [AssetsService, AssetResolverService]
})
export class AssetsModule {
}
