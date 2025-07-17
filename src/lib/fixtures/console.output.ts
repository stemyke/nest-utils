import { Injectable } from '@nestjs/common';
import { FixtureOutput } from '../common-types';

@Injectable()
export class ConsoleOutput implements FixtureOutput {
    write(message: string) {
        console.log(message);
    }

    writeln(message: string) {
        console.log(message + `\n`);
    }
}
