import { Injectable } from '@nestjs/common';

import { Translator } from '../common-types';
import { getValue, interpolate, isString } from '../utils';


@Injectable()
export class StaticTranslator implements Translator {

    protected dictionaries: { [lang: string]: Record<string, string> };

    constructor() {
        this.dictionaries = {};
    }

    setDictionary(lang: string, dictionary: Record<string, string>) {
        this.dictionaries[lang] = dictionary;
    }

    getDictionary(lang: string) {
        return Promise.resolve();
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
