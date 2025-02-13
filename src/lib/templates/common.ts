import { Type } from '@nestjs/common';
import { FactoryToken, ITranslator } from '../common-types';

export interface ITemplatesModuleOpts {
    templatesDir: string;
    translator?: Type<ITranslator>;
}

export const TEMPLATES_DIR: FactoryToken<string> = Symbol.for('TEMPLATES_DIR');
export const TEMPLATES_TRANSLATOR: FactoryToken<ITranslator> = Symbol.for(
    'TEMPLATES_TRANSLATOR'
);
export const TEMPLATES_MODULE_OPTIONS: FactoryToken<ITemplatesModuleOpts> =
    Symbol.for('TEMPLATES_MODULE_OPTIONS');
