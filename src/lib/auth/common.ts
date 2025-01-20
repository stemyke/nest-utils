import { Type } from '@nestjs/common';
import { FactoryToken, ITranslator } from '../common-types';

/**
 * Base user interface
 */
export interface IUser {
    // Users username
    username: string;
    // Optional expire date that can be checked on login and used when generating JWT token
    expireDate?: Date;
    // Convert user to JSON
    toJSON?(): Record<string, any>;
}

/**
 * Calculated user context that can depend on any scenario
 */
export interface IUserContext {
    // Context id
    id: string;
    // Available user roles
    roles: string[];
    // Anything else
    [key: string]: any;
}

/**
 * Calculated auth context that contains the user and its context
 */
export interface IAuthContext {
    user: IUser;
    context: IUserContext;
    impersonator?: {
        user: IUser;
        context: IUserContext;
    }
}

/**
 * User handler interface
 */
export interface IUserHandler {
    findByCredentials(credential: string, password: string): Promise<IAuthContext>;
    findById(id: string): Promise<IAuthContext>;
}

export interface IJwtPayload {
    id: string;
    impersonator?: string;
}

export interface IJwtResponse {
    token: string;
    user: Record<string, any>;
}

export interface IAuthModuleOpts {
    jwtSecret?: string;
    userHandler?: Type<IUserHandler>;
}

export const JWT_SECRET: FactoryToken<string> = Symbol.for('JWT_SECRET');
export const USER_HANDLER: FactoryToken<IUserHandler> = Symbol.for('USER_HANDLER');
export const AUTH_MODULE_OPTIONS: FactoryToken<IAuthModuleOpts> =
    Symbol.for('AUTH_MODULE_OPTIONS');
