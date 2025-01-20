import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
    IAuthContext,
    IJwtPayload, IJwtResponse,
    IUser,
    IUserHandler,
    USER_HANDLER
} from './common';
import { isFunction } from '../utils';

@Injectable()
export class AuthService {
    constructor(protected jwt: JwtService, @Inject(USER_HANDLER) protected users: IUserHandler) {
        console.log('Auth serbice', this);
    }

    async validate(
        credential: string,
        password: string
    ): Promise<IAuthContext> {
        const ctx = await this.users.findByCredentials(credential, password);
        if (!ctx) {
            throw new UnauthorizedException();
        }
        return ctx;
    }

    async byId(id: string): Promise<IAuthContext> {
        const ctx = await this.users.findById(id);
        if (!ctx) {
            throw new UnauthorizedException();
        }
        return ctx;
    }

    login(ctx: IAuthContext): IJwtResponse {
        const payload: IJwtPayload = {
            id: ctx.context.id
        };
        return {
            token: this.jwt.sign(payload),
            user: this.response(ctx)
        };
    }

    async impersonate(ctx: IAuthContext, target: string): Promise<IJwtResponse> {
        const impersonated = await this.byId(target);
        const impersonator = ctx.impersonator || ctx;
        impersonated.impersonator = impersonator;
        const payload: IJwtPayload = {
            id: impersonated.context.id,
            impersonator: impersonator.context.id
        };
        return {
            token: this.jwt.sign(payload),
            user: this.response(impersonated)
        };
    }

    async endImpersonate(ctx: IAuthContext): Promise<IJwtResponse> {
        const target = ctx.impersonator || ctx;
        const payload: IJwtPayload = {
            id: target.context.id
        };
        delete target['impersonator'];
        return {
            token: this.jwt.sign(payload),
            user: this.response(target)
        };
    }

    response(ctx: IAuthContext): Record<string, any> {
        const user: Record<string, any> = isFunction(ctx.user.toJSON) ? ctx.user.toJSON() : Object.assign({}, ctx.user);
        Object.assign(user, ctx.context);
        if (ctx.impersonator) {
            user.impersonator = this.response(ctx.impersonator);
        }
        return user;
    }
}
