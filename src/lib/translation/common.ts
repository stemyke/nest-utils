import { Type } from '@nestjs/common';
import { FactoryToken } from '../common-types';

export interface DictionaryProvider {
    getDictionary(lang: string): Promise<Record<string, string>>;
}

export interface TranslationModuleOpts {
    translationsPath: string;
    provider?: Type<DictionaryProvider>;
}

export const TRANSLATIONS_PATH: FactoryToken<string> = Symbol.for('TRANSLATIONS_DIR');
export const DICTIONARY_PROVIDER: FactoryToken<DictionaryProvider> = Symbol.for(
    'DICTIONARY_PROVIDER'
);
export const TRANSLATION_MODULE_OPTIONS: FactoryToken<TranslationModuleOpts> =
    Symbol.for('TRANSLATION_MODULE_OPTIONS');
