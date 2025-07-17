import { Type } from '@nestjs/common';
import { FactoryToken, Translator } from '../common-types';

export interface TemplatesModuleOpts {
    templatesDir: string;
    translator?: Type<Translator>;
}

export const TEMPLATES_DIR: FactoryToken<string> = Symbol.for('TEMPLATES_DIR');
export const TEMPLATES_TRANSLATOR: FactoryToken<Translator> = Symbol.for(
    'TEMPLATES_TRANSLATOR'
);
export const TEMPLATES_MODULE_OPTIONS: FactoryToken<TemplatesModuleOpts> =
    Symbol.for('TEMPLATES_MODULE_OPTIONS');
