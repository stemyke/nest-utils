import {
    BadRequestException,
    CallHandler,
    ExecutionContext,
    HttpException,
    Injectable,
    NestInterceptor,
    StreamableFile,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { map } from 'rxjs';
import { parseRange, rangeStream } from '../../utils';

@Injectable()
export class SeekableInterceptor implements NestInterceptor {
    async intercept(context: ExecutionContext, next: CallHandler) {
        const req = context.switchToHttp().getRequest() as Request;
        const res = context.switchToHttp().getResponse() as Response;
        const headers = (req.headers || {}) as Record<string, string>;
        return next.handle().pipe(map(data => {
            if (data instanceof StreamableFile) {
                const opts = data.options;
                if (!opts.length || !headers.range) return data;
                const ranges = parseRange(opts.length, headers.range);
                if (ranges === -2) {
                    throw new BadRequestException(`Malformed range: ${headers.range}`);
                }
                if (ranges === -1) {
                    // unsatisfiable range
                    res.set('Content-Range', '*/' + opts.length);
                    throw new HttpException(`Range not satisfiable: ${headers.range}`, 416);
                }
                if (ranges.type !== 'bytes') return data;
                if (ranges.length > 1) {
                    throw new BadRequestException(`Can only serve single range: ${headers.range}`);
                }
                const start = ranges[0].start;
                const end = ranges[0].end;
                // formatting response
                res.status(206);
                res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + opts.length);
                // slicing the stream to partial content
                return new StreamableFile(
                    data.getStream().pipe(rangeStream(start, end)),
                    {
                        ...opts,
                        length: (end - start) + 1
                    }
                );
            }
            return data;
        }));
    }
}
