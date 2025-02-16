import {lstat, readdir, readFile} from 'fs/promises';
import { Readable, PassThrough } from 'stream';
import { createReadStream } from 'fs';
import {join} from 'path';
import {Inject, Injectable} from '@nestjs/common'
import Handlebars from 'handlebars';

import { Callable, ITranslator } from '../common-types';
import { TEMPLATES_DIR, TEMPLATES_TRANSLATOR} from './common';

@Injectable()
export class TemplatesService {

    templates: {[name: string]: Callable};

    protected initPromise: Promise<any>;

    constructor(@Inject(TEMPLATES_DIR) protected templatesDir: string,
                @Inject(TEMPLATES_TRANSLATOR) protected translator: ITranslator) {
        this.templates = {};
        Handlebars.registerHelper(`object`, function({hash}) {
            return hash;
        });
        Handlebars.registerHelper(`now`, function() {
            return new Date().getTime();
        });
        Handlebars.registerHelper(`keys`, function(obj: any) {
            return !obj ? [] : Object.keys(obj);
        });
        Handlebars.registerHelper(`translate`, function (key: string, params: any) {
            return translator.getTranslationSync(this.language, key, params);
        });
    }

    protected init(): Promise<any> {
        this.initPromise = this.initPromise || this.parseTemplates(this.templatesDir, []);
        return this.initPromise;
    }

    asset(path: string): Readable {
        return createReadStream(join(this.templatesDir, 'assets', path), {});
    }

    async parseTemplates(dir: string, dirPath: string[]): Promise<void> {
        const files = await readdir(dir);
        for (const file of files) {
            const path = join(dir, file);
            const pathStats = await lstat(path);
            if (pathStats.isDirectory()) {
                await this.parseTemplates(join(dir, file), dirPath.concat([file]));
                continue;
            }
            const parts = file.split('.');
            parts.pop();
            const name = parts.join('.');
            const fullName = dirPath.concat([name]).join('-');
            const content = await readFile(path, 'utf8');
            this.templates[fullName] = Handlebars.compile(content);
            Handlebars.registerPartial(fullName, content);
        }
    }

    async render(template: string, language: string, context?: Record<string, any>): Promise<string> {
        await this.init();
        await this.translator.getDictionary(language);
        if (!this.templates[template]) {
            return Promise.reject(`Template not found with name: ${template}`);
        }
        context = Object.assign({language}, context || {});
        const res = this.templates[template](context);
        return res instanceof Error ? await Promise.reject(res) : res;
    }
}
