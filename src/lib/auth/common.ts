import { Type } from '@nestjs/common';
import { FactoryToken } from '../common-types';

/**
 * Base user interface
 */
export interface AuthUser {
    // User's username
    username: string;
    // Optional expire date that can be checked on login and used when generating JWT token
    expireDate?: Date;
    // Convert user to JSON
    toJSON?(): Record<string, any>;
}

/**
 * Calculated user context that can depend on any scenario
 */
export interface UserContext {
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
export interface AuthContext {
    user: AuthUser;
    context: UserContext;
    impersonator?: {
        user: AuthUser;
        context: UserContext;
    }
}

/**
 * User handler interface
 */
export interface UserHandler {
    findByCredentials(credential: string, password: string): Promise<AuthContext>;
    findById(id: string): Promise<AuthContext>;
}

export interface JwtPayload {
    id: string;
    impersonator?: string;
}

export interface JwtResponse {
    token: string;
    user: Record<string, any>;
}

export interface AuthModuleOpts {
    jwtSecret?: string;
    userHandler?: Type<UserHandler>;
}

export const JWT_SECRET: FactoryToken<string> = Symbol.for('JWT_SECRET');
export const USER_HANDLER: FactoryToken<UserHandler> = Symbol.for('USER_HANDLER');
export const AUTH_MODULE_OPTIONS: FactoryToken<AuthModuleOpts> =
    Symbol.for('AUTH_MODULE_OPTIONS');
