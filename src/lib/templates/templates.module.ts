import {DynamicModule, Module, Provider} from '@nestjs/common';

import {ModuleOptionsProvider} from '../common-types';
import {
    createRootModule,
    createRootModuleAsync,
    FromOptionsProviders,
} from '../utils';

import {TemplatesModuleOpts, TEMPLATES_DIR, TEMPLATES_MODULE_OPTIONS, TEMPLATES_TRANSLATOR} from './common';
import {TemplatesService} from './templates.service';
import {StaticTranslator} from "./static.translator";

function createProviders(): Provider[] {
    return new FromOptionsProviders(TEMPLATES_MODULE_OPTIONS)
        .add(
            StaticTranslator,
            TemplatesService
        )
        .useValue(TEMPLATES_DIR, opts => {
            if (!opts.templatesDir) {
                throw new Error(`templatesDir should be a non empty string`);
            }
            return opts.templatesDir;
        })
        .useType(TEMPLATES_TRANSLATOR, opts => opts.translator || StaticTranslator)
        .asArray();
}

@Module({
    imports: [],
    controllers: []
})
export class TemplatesModule {

    static forRoot(opts: TemplatesModuleOpts): DynamicModule {
        return createRootModule(
            TemplatesModule,
            TEMPLATES_MODULE_OPTIONS,
            opts,
            createProviders()
        );
    }

    static forRootAsync(opts: ModuleOptionsProvider<TemplatesModuleOpts>): DynamicModule {
        return createRootModuleAsync(
            TemplatesModule,
            TEMPLATES_MODULE_OPTIONS,
            opts,
            createProviders()
        );
    }
}
