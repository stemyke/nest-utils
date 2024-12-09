import { createParamDecorator, ExecutionContext, Type } from '@nestjs/common';
import { EntityContext, EntityPipe } from '../pipes/entity.pipe';

const ResEntity = createParamDecorator(
    (res: EntityContext, ctx: ExecutionContext) => {
        res.ctx = ctx;
        return res;
    }
);

export function ResolveEntity(type: Type, throwError: boolean = true, idField: string = 'id') {
    return ResEntity({type, throwError, idField}, EntityPipe);
}
