import { Inject, Injectable } from '@nestjs/common';
import { resolve } from 'path';
import { readdir, readFile, stat } from 'fs/promises';

import { IDictionaryProvider, TRANSLATIONS_PATH } from './common';

@Injectable()
export class FsDictionaryProvider implements IDictionaryProvider {

    constructor(@Inject(TRANSLATIONS_PATH) protected path: string) {

    }

    async getDictionary(lang: string) {
        try {
            const stats = await stat(this.path);
            if (!stats.isDirectory()) {
                console.error(`Translation path '${this.path}' is not a directory!`);
                return {};
            }
        } catch (e) {
            return {};
        }
        const files = await readdir(this.path);
        const languages = files
            .filter(f => f.endsWith('.json'))
            .reduce((res, f) => {
                res[f.replace('.json', '')] = f;
                return res;
            }, {} as Record<string, string>);
        const fileName = languages[lang] || languages.en || Object.values(languages).shift();
        const path = resolve(this.path, `${fileName}`);
        try {
            const stats = await stat(path);
            if (stats.isFile()) {
                const content = await readFile(path, 'utf8');
                return JSON.parse(content);
            }
        } catch (e) {
            console.error(e);
            return {};
        }
        return {};
    }
}
