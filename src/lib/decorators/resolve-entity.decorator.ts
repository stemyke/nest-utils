import { createParamDecorator, ExecutionContext, Type } from '@nestjs/common';
import { EntityContext, EntityPipe } from '../pipes/entity.pipe';

const ResEntity = createParamDecorator(
    (res: EntityContext, ctx: ExecutionContext) => {
        res.ctx = ctx;
        return res;
    }
);

export function ResolveEntity(type: Type, throwError: boolean = true) {
    return ResEntity({type, throwError}, EntityPipe);
}
