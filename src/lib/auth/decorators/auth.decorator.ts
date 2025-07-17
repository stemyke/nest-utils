import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthContext } from '../common';

export const Auth = createParamDecorator(
    (userOnly: boolean = false, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const auth = request.user as AuthContext;
        return userOnly ? auth.user : auth;
    },
);
