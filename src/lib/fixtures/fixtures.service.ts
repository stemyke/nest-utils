import { Inject, Injectable } from '@nestjs/common';

import { Fixture, FixtureOutput } from '../common-types';
import { FIXTURES } from './common';
import { ConsoleOutput } from './console.output';

@Injectable()
export class FixturesService {
    constructor(
        @Inject(FIXTURES) protected fixtures: Fixture[],
        protected output: ConsoleOutput,
    ) {
    }

    async load(output?: FixtureOutput): Promise<any> {
        output = output || this.output;
        output.write(`Loading fixtures: ${this.fixtures.length} items`);
        for (const fixture of this.fixtures) {
            await fixture.load(output);
        }
    }
}
