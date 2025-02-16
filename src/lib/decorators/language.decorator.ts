import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const Language = createParamDecorator((_, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest() as Request;
    return req.query.language || req.headers['x-language'] || 'en';
});
