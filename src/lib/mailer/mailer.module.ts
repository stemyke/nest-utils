import { DynamicModule, Module, Provider } from '@nestjs/common';

import { IModuleOptionsProvider } from '../common-types';
import {
    createRootModule,
    createRootModuleAsync,
    FromOptionsProviders,
} from '../utils';

import {
    DEFAULT_MAIL_OPTIONS,
    MAILER_MODULE_OPTIONS,
    MailerModuleOpts, PREVIEW_MAILS,
    SMTP_OPTIONS
} from './common';
import { MailerService } from './mailer.service';

function createProviders(): Provider[] {
    return new FromOptionsProviders(MAILER_MODULE_OPTIONS)
        .add(MailerService)
        .useValue(SMTP_OPTIONS, async (opts) => opts.smtp)
        .useValue(DEFAULT_MAIL_OPTIONS, async (opts) => opts.defaultOptions)
        .useValue(PREVIEW_MAILS, async (opts) => opts.preview ?? false)
        .asArray();
}

@Module({
    imports: [],
    controllers: [],
})
export class MailerModule {
    static forRoot(opts: MailerModuleOpts): DynamicModule {
        return createRootModule(
            MailerModule,
            MAILER_MODULE_OPTIONS,
            opts,
            createProviders()
        );
    }

    static forRootAsync(
        opts: IModuleOptionsProvider<MailerModuleOpts>
    ): DynamicModule {
        return createRootModuleAsync(
            MailerModule,
            MAILER_MODULE_OPTIONS,
            opts,
            createProviders()
        );
    }
}
