import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { AuthContext } from '../common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {

    constructor(private authService: AuthService) {
        super({
            usernameField: 'credential',
        });
    }

    async validate(credential: string, password: string): Promise<AuthContext> {
        return this.authService.validate(credential, password);
    }
}
