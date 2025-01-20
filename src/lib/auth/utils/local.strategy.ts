import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { IAuthContext } from '../common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {

    constructor(private authService: AuthService) {
        super({
            usernameField: 'credential',
        });
    }

    async validate(credential: string, password: string): Promise<IAuthContext> {
        return this.authService.validate(credential, password);
    }
}
