import { Inject, Injectable } from '@nestjs/common';

import { ITranslator } from '../common-types';
import { getValue, interpolate, isString } from '../utils';
import { DICTIONARY_PROVIDER, IDictionaryProvider } from './common';

@Injectable()
export class TranslationService implements ITranslator {

    protected promises: { [lang: string]: Promise<void> };
    protected dictionaries: { [lang: string]: Record<string, string> };

    constructor(@Inject(DICTIONARY_PROVIDER) protected provider: IDictionaryProvider) {
        this.promises = {};
        this.dictionaries = {};
    }

    getDictionary(lang: string) {
        this.promises[lang] = this.promises[lang] || this.provider.getDictionary(lang).then(dict => {
            this.dictionaries[lang] = dict;
        });
        return this.promises[lang];
    }

    getTranslationSync(lang: string, key: string, params: any): string {
        if (!isString(key) || !key.length) {
            throw new Error(`Parameter "key" required`);
        }
        const dictionary = this.dictionaries[lang];
        const translation = getValue(dictionary, key, key) || key;
        return interpolate(translation, params);
    }
}
