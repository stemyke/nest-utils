import { Type } from '@nestjs/common';
import { FactoryToken, Fixture } from '../common-types';

export interface FixturesModuleOpts {
    fixtures: Type<Fixture>[];
}

export const FIXTURES: FactoryToken<Fixture> = Symbol.for('FIXTURES');

export const FIXTURES_MODULE_OPTIONS: FactoryToken<FixturesModuleOpts> =
    Symbol.for('FIXTURES_MODULE_OPTIONS');
