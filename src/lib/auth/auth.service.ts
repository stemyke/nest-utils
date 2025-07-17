import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
    AuthContext,
    JwtPayload, JwtResponse,
    AuthUser,
    UserHandler,
    USER_HANDLER
} from './common';
import { isFunction } from '../utils';

@Injectable()
export class AuthService {
    constructor(protected jwt: JwtService, @Inject(USER_HANDLER) protected users: UserHandler) {
    }

    async validate(
        credential: string,
        password: string
    ): Promise<AuthContext> {
        const ctx = await this.users.findByCredentials(credential, password);
        if (!ctx) {
            throw new UnauthorizedException();
        }
        return ctx;
    }

    async byId(id: string): Promise<AuthContext> {
        const ctx = await this.users.findById(id);
        if (!ctx) {
            throw new UnauthorizedException();
        }
        return ctx;
    }

    login(ctx: AuthContext): JwtResponse {
        const payload: JwtPayload = {
            id: ctx.context.id
        };
        return {
            token: this.jwt.sign(payload),
            user: this.response(ctx)
        };
    }

    async impersonate(ctx: AuthContext, target: string): Promise<JwtResponse> {
        const impersonated = await this.byId(target);
        const impersonator = ctx.impersonator || ctx;
        impersonated.impersonator = impersonator;
        const payload: JwtPayload = {
            id: impersonated.context.id,
            impersonator: impersonator.context.id
        };
        return {
            token: this.jwt.sign(payload),
            user: this.response(impersonated)
        };
    }

    async endImpersonate(ctx: AuthContext): Promise<JwtResponse> {
        const target = ctx.impersonator || ctx;
        const payload: JwtPayload = {
            id: target.context.id
        };
        delete target['impersonator'];
        return {
            token: this.jwt.sign(payload),
            user: this.response(target)
        };
    }

    response(ctx: AuthContext): Record<string, any> {
        const user: Record<string, any> = isFunction(ctx.user.toJSON) ? ctx.user.toJSON() : Object.assign({}, ctx.user);
        Object.assign(user, ctx.context);
        if (ctx.impersonator) {
            user.impersonator = this.response(ctx.impersonator);
        }
        return user;
    }
}
