import { Injectable } from '@nestjs/common';

import { IAuthContext, IUserHandler } from '../common';

@Injectable()
export class EnvUserHandler implements IUserHandler {
    findByCredentials(
        credential: string,
        password: string
    ): Promise<IAuthContext> {
        throw new Error('Method not implemented.');
    }

    findById(id: string): Promise<IAuthContext> {
        throw new Error('Method not implemented.');
    }
}
