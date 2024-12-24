import {
    BadRequestException,
    ExecutionContext,
    Injectable,
    NotFoundException,
    PipeTransform,
    Type,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, HydratedDocument, isValidObjectId, Model } from 'mongoose';

export interface EntityContext {
    type: Type;
    throwError: boolean;
    idField: string;
    ctx?: ExecutionContext;
}

@Injectable()
export class EntityPipe implements PipeTransform<HydratedDocument<any>> {
    constructor(@InjectConnection() protected connection: Connection) {
    }

    async transform({ type, throwError, idField, ctx }: EntityContext) {
        let model: Model<any> = null;
        try {
            model = this.connection.model(type.name);
        } catch (e) {
            throw new NotFoundException(`Model does not exists for type: ${type.name} ${e.message}`);
        }
        const req = ctx.switchToHttp().getRequest();
        const name = type.name.charAt(0).toLowerCase() + type.name.substring(1);
        const id = req.params[`${name}Id`] || req.params[idField];
        try {
            const doc = (idField !== 'id' ? await model.findOne({[idField]: id}) : null) || await model.findById(id);
            if (!doc) {
                throw new NotFoundException(`${type.name} entity could not be found by id: ${id}`);
            }
            req.entity = doc;
            return doc;
        } catch (e) {
            if (throwError) {
                if (e instanceof Error && e.message.includes('Cast to ObjectId failed')) {
                    throw new BadRequestException(`Maybe an invalid id provided for resolving ${type.name} entity: ${id}`);
                }
                throw e;
            }
        }
        return null;
    }
}
