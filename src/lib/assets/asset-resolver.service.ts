import { Injectable } from '@nestjs/common';
import {IAsset} from './common';
import {AssetsService} from './assets.service';

@Injectable()
export class AssetResolverService {

    constructor(readonly assets: AssetsService) {

    }

    async resolve(id: string, lazy: boolean = false): Promise<IAsset> {
        let asset: IAsset = null;
        // if (lazy) {
        //     const lazyAsset = await this.lazyAssets.read(id);
        //     if (!lazyAsset) return null;
        //     return lazyAsset.loadAsset();
        // }
        asset = await this.assets.read(id);
        // if (!asset) {
        //     const lazyAsset = await this.lazyAssets.read(id);
        //     if (!lazyAsset) return null;
        //     return lazyAsset.loadAsset();
        // }
        return asset;
    }
}
