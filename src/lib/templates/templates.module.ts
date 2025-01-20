import {DynamicModule, Module, Provider} from '@nestjs/common';

import {IModuleOptionsProvider} from '../common-types';
import {
    createRootModule,
    createRootModuleAsync,
    FromOptionsProviders,
} from '../utils';

import {ITemplatesModuleOpts, TEMPLATES_DIR, TEMPLATES_MODULE_OPTIONS, TEMPLATES_TRANSLATOR} from './common';
import {TemplatesService} from './templates.service';
import {StaticTranslator} from "./static.translator";

function createProviders(): Provider[] {
    return new FromOptionsProviders(TEMPLATES_MODULE_OPTIONS)
        .add(
            StaticTranslator,
            TemplatesService
        )
        .useValue(TEMPLATES_DIR, opts => opts.templatesDir || '../templates')
        .useType(TEMPLATES_TRANSLATOR, opts => opts.translator || StaticTranslator)
        .asArray();
}

@Module({
    imports: [],
    controllers: []
})
export class TemplatesModule {

    static forRoot(opts?: ITemplatesModuleOpts): DynamicModule {
        return createRootModule(
            TemplatesModule,
            TEMPLATES_MODULE_OPTIONS,
            opts,
            createProviders()
        );
    }

    static forRootAsync(opts: IModuleOptionsProvider<ITemplatesModuleOpts>): DynamicModule {
        return createRootModuleAsync(
            TemplatesModule,
            TEMPLATES_MODULE_OPTIONS,
            opts,
            createProviders()
        );
    }
}
