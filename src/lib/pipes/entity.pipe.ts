import {
    ArgumentMetadata,
    BadRequestException,
    ExecutionContext,
    Injectable,
    NotFoundException,
    PipeTransform,
    Type
} from '@nestjs/common';
import { Connection, HydratedDocument, isValidObjectId, Model } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';

export interface EntityContext {
    type: Type;
    throwError: boolean;
    ctx?: ExecutionContext;
}

@Injectable()
export class EntityPipe implements PipeTransform<HydratedDocument<any>> {
    constructor(@InjectConnection() protected connection: Connection) {
    }

    async transform({ type, throwError, ctx }: EntityContext, metadata: ArgumentMetadata) {
        const req = ctx.switchToHttp().getRequest();
        const id = req.params[`${type.name}Id`] || req.params.id;
        if (!isValidObjectId(id)) {
            throw new BadRequestException(`Invalid id provided for resolving ${type.name} entity: ${id}`);
        }
        let model: Model<any> = null;
        try {
            model = this.connection.model(type.name);
        } catch (e) {
            throw new NotFoundException(`Model does not exists for type: ${type.name} ${e.message}`);
        }
        const doc = model.findById(id);
        if (!doc) {
            if (throwError) {
                throw new NotFoundException(`${type.name} entity could not be found by id: ${id}`);
            }
            return null;
        }
        return doc;
    }
}
