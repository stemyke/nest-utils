import {DynamicModule, Module, Provider} from '@nestjs/common';

import {ModuleOptionsProvider} from '../common-types';
import {
    createRootModule,
    createRootModuleAsync,
    FromOptionsProviders,
} from '../utils';

import {FixturesModuleOpts, FIXTURES, FIXTURES_MODULE_OPTIONS} from './common';
import {FixturesService} from './fixtures.service';
import {ConsoleOutput} from './console.output';

function createProviders(): Provider[] {
    return new FromOptionsProviders(FIXTURES_MODULE_OPTIONS)
        .add(
            ConsoleOutput,
            FixturesService
        )
        .useTypes(FIXTURES, opts => {
            if (!Array.isArray(opts.fixtures)) {
                throw new Error(`fixtures should be an array of types`);
            }
            return opts.fixtures;
        })
        .asArray();
}

@Module({
    imports: [],
    controllers: []
})
export class FixturesModule {

    static forRoot(opts: FixturesModuleOpts): DynamicModule {
        return createRootModule(
            FixturesModule,
            FIXTURES_MODULE_OPTIONS,
            opts,
            createProviders()
        );
    }

    static forRootAsync(opts: ModuleOptionsProvider<FixturesModuleOpts>): DynamicModule {
        return createRootModuleAsync(
            FixturesModule,
            FIXTURES_MODULE_OPTIONS,
            opts,
            createProviders()
        );
    }
}
