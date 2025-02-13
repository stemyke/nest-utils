import { Type } from '@nestjs/common';
import { FactoryToken } from '../common-types';

export interface IDictionaryProvider {
    getDictionary(lang: string): Promise<Record<string, string>>;
}

export interface ITranslationModuleOpts {
    translationsPath?: string;
    provider?: Type<IDictionaryProvider>;
}

export const TRANSLATIONS_PATH: FactoryToken<string> = Symbol.for('TRANSLATIONS_DIR');
export const DICTIONARY_PROVIDER: FactoryToken<IDictionaryProvider> = Symbol.for(
    'DICTIONARY_PROVIDER'
);
export const TRANSLATION_MODULE_OPTIONS: FactoryToken<ITranslationModuleOpts> =
    Symbol.for('TRANSLATION_MODULE_OPTIONS');
