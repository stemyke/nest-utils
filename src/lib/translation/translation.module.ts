import { DynamicModule, Module, Provider } from '@nestjs/common';

import { ModuleOptionsProvider } from '../common-types';
import {
    createRootModule,
    createRootModuleAsync,
    FromOptionsProviders,
} from '../utils';

import {
    DICTIONARY_PROVIDER,
    TranslationModuleOpts,
    TRANSLATION_MODULE_OPTIONS,
    TRANSLATIONS_PATH,
} from './common';
import { TranslationService } from './translation.service';
import { FsDictionaryProvider } from './fs-dictionary-provider.service';

function createProviders(): Provider[] {
    return new FromOptionsProviders(TRANSLATION_MODULE_OPTIONS)
        .add(
            FsDictionaryProvider,
            TranslationService
        )
        .useValue(TRANSLATIONS_PATH, async opts => {
            if (!opts.translationsPath) {
                throw new Error(`translationsPath should be a non empty string`);
            }
            return opts.translationsPath;
        })
        .useType(DICTIONARY_PROVIDER, opts => opts.provider || FsDictionaryProvider)
        .asArray();
}

@Module({
    imports: [],
    controllers: []
})
export class TranslationModule {

    static forRoot(opts: TranslationModuleOpts): DynamicModule {
        return createRootModule(
            TranslationModule,
            TRANSLATION_MODULE_OPTIONS,
            opts,
            createProviders()
        );
    }

    static forRootAsync(opts: ModuleOptionsProvider<TranslationModuleOpts>): DynamicModule {
        return createRootModuleAsync(
            TranslationModule,
            TRANSLATION_MODULE_OPTIONS,
            opts,
            createProviders()
        );
    }
}
