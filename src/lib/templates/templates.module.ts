import {DynamicModule, Module, Provider} from '@nestjs/common';

import {IModuleOptionsProvider} from '../common-types';
import {
    createRootModule,
    createRootModuleAsync,
    FromOptionsProviders,
} from '../utils';

import {ITemplatesModuleOpts, TEMPLATES_DIR, TEMPLATES_MODULE_OPTIONS, TEMPLATES_TRANSLATOR} from './common';
import {TemplatesService} from './templates.service';
import {TemplatesTranslator} from "./templates-translator";

export function createTemplatesProviders(): Provider[] {
    return new FromOptionsProviders(TEMPLATES_MODULE_OPTIONS)
        .add(
            TemplatesTranslator,
            TemplatesService
        )
        .useValue(TEMPLATES_DIR, opts => opts.templatesDir || '../templates')
        .useType(TEMPLATES_TRANSLATOR, opts => opts.translator || TemplatesTranslator)
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
            createTemplatesProviders()
        );
    }

    static forRootAsync(opts: IModuleOptionsProvider<ITemplatesModuleOpts>): DynamicModule {
        return createRootModuleAsync(
            TemplatesModule,
            TEMPLATES_MODULE_OPTIONS,
            opts,
            createTemplatesProviders()
        );
    }
}
