import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthContext, JwtPayload, JWT_SECRET } from '../common';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

    constructor(protected authService: AuthService,
                @Inject(JWT_SECRET) protected jwtSecret: string) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret,
        });
    }

    async validate(payload: JwtPayload): Promise<AuthContext> {
        const ctx = await this.authService.byId(payload.id);
        if (payload.impersonator) {
            ctx.impersonator = await this.authService.byId(payload.impersonator);
        }
        return ctx;
    }
}
