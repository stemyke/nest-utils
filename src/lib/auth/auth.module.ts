import { APP_GUARD } from '@nestjs/core';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { ModuleOptionsProvider } from '../common-types';
import {
    createRootModule,
    createRootModuleAsync,
    FromOptionsProviders,
} from '../utils';

import {
    AUTH_MODULE_OPTIONS,
    AuthModuleOpts,
    JWT_SECRET,
    USER_HANDLER,
} from './common';
import { EnvUserHandler } from './utils/env-user.handler';
import { AuthService } from './auth.service';
import { AuthGuard } from './utils/auth.guard';
import { JwtStrategy } from './utils/jwt.strategy';
import { LocalStrategy } from './utils/local.strategy';

function createProviders(): Provider[] {
    return new FromOptionsProviders(AUTH_MODULE_OPTIONS)
        .add(
            AuthService,
            AuthGuard,
            JwtStrategy,
            LocalStrategy
        )
        .useValue(JWT_SECRET, opts => opts.jwtSecret || 'dwL)RagHWjvaQJiT&amp;rPrdwL)Rag')
        .useType(USER_HANDLER, opts => opts.userHandler || EnvUserHandler)
        .asArray();
}

@Module({
    imports: [
        JwtModule.registerAsync({
            inject: [JWT_SECRET],
            useFactory: async (jwtSecret: string) => ({
                secret: jwtSecret,
                signOptions: {
                    expiresIn: 36000,
                },
            }),
        })
    ],
    providers: [
        {
            provide: APP_GUARD,
            useExisting: AuthGuard
        }
    ],
    controllers: []
})
export class AuthModule {

    static forRoot(opts?: AuthModuleOpts): DynamicModule {
        return createRootModule(
            AuthModule,
            AUTH_MODULE_OPTIONS,
            opts,
            createProviders()
        );
    }

    static forRootAsync(opts: ModuleOptionsProvider<AuthModuleOpts>): DynamicModule {
        return createRootModuleAsync(
            AuthModule,
            AUTH_MODULE_OPTIONS,
            opts,
            createProviders()
        );
    }
}
