import { Transform } from 'stream';

export function rangeStream(start: number, end: number): Transform {
    end = typeof end === 'number' ? end + 1 : Infinity;

    let bytesReceived = 0;
    let lastByteFound = false;

    return new Transform({
        transform(chunk, enc, next) {
            if (lastByteFound) {
                // no point in continuing to process the incoming data when we've found
                // all desired bytes, close the stream gracefully.
                this.push(null);
                this.destroy();
                return;
            }

            bytesReceived += chunk.length;

            if (!lastByteFound && bytesReceived >= start) {
                if (start - (bytesReceived - chunk.length) > 0)
                    chunk = chunk.slice(start - (bytesReceived - chunk.length));

                if (end <= bytesReceived) {
                    this.push(
                        chunk.slice(0, chunk.length - (bytesReceived - end))
                    );
                    lastByteFound = true;
                } else {
                    this.push(chunk);
                }
            }
            next();
        },
    });
}
