import { Injectable } from '@nestjs/common';

import { AuthContext, UserHandler } from '../common';

@Injectable()
export class EnvUserHandler implements UserHandler {
    findByCredentials(
        credential: string,
        password: string
    ): Promise<AuthContext> {
        throw new Error('Method not implemented.');
    }

    findById(id: string): Promise<AuthContext> {
        throw new Error('Method not implemented.');
    }
}
