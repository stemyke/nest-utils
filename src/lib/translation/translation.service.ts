import { Inject, Injectable } from '@nestjs/common';

import { Translator } from '../common-types';
import { getValue, interpolate, isString } from '../utils';
import { DICTIONARY_PROVIDER, DictionaryProvider } from './common';

@Injectable()
export class TranslationService implements Translator {

    protected promises: { [lang: string]: Promise<void> };
    protected dictionaries: { [lang: string]: Record<string, string> };

    constructor(@Inject(DICTIONARY_PROVIDER) protected provider: DictionaryProvider) {
        this.promises = {};
        this.dictionaries = {};
    }

    getDictionary(lang: string) {
        this.promises[lang] = this.promises[lang] || this.provider.getDictionary(lang).then(dict => {
            this.dictionaries[lang] = dict;
        });
        return this.promises[lang];
    }

    getTranslationSync(lang: string, key: string, params?: Record<string, any>): string {
        if (!isString(key) || !key.length) {
            throw new Error(`Parameter "key" required`);
        }
        const dictionary = this.dictionaries[lang];
        const translation = getValue(dictionary, key, key) || key;
        return interpolate(translation, params);
    }
}
