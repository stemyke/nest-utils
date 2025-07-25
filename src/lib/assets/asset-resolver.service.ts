import { Injectable } from '@nestjs/common';
import type { ObjectId } from 'mongodb';

import {Asset} from './common';
import {AssetsService} from './assets.service';

@Injectable()
export class AssetResolverService {

    constructor(readonly assets: AssetsService) {

    }

    async resolve(id: string | ObjectId, lazy: boolean = false): Promise<Asset> {
        let asset: Asset = null;
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
