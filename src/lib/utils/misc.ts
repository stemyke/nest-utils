import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { EOL } from 'os';
import { ModuleRef } from '@nestjs/core';
import { DynamicModule, InjectionToken, Provider, Type } from '@nestjs/common';
import {
    AsyncOptions,
    AsyncOptionsProvider,
    AsyncProviders,
    Callable,
    Constructor,
    FactoryToken,
    FromOptionsFactory,
    IModuleOptionsFactory,
    IModuleOptionsProvider,
} from '../common-types';

export function isNullOrUndefined(value: any): boolean {
    return value == null || typeof value == 'undefined';
}

export function isDefined(value: any): boolean {
    return !isNullOrUndefined(value);
}

export function validateValues(
    value: any,
    validator: (value: any) => boolean
): any {
    if (Array.isArray(value)) {
        return value.every((v) => validateValues(v, validator));
    }
    return validator(value);
}

export function transformValues(
    value: any,
    transformer: (value: any) => any
): any {
    if (Array.isArray(value)) {
        return value.map((v) => transformValues(v, transformer));
    }
    return isNullOrUndefined(value) ? value : transformer(value);
}

export function getType(obj: any): string {
    const regex = new RegExp('\\s([a-zA-Z]+)');
    return Object.prototype.toString.call(obj).match(regex)[1].toLowerCase();
}

export function isObject(value: any): boolean {
    return getType(value) == 'object';
}

export function isArray(value: any): value is Array<any> {
    return Array.isArray(value);
}

export function isBuffer(value: any): value is Buffer {
    return value instanceof Buffer;
}

export function isBoolean(value: any): value is boolean {
    return typeof value === 'boolean';
}

export function isDate(value: any): value is Date {
    return !!value && value[Symbol.toPrimitive] && !isNaN(value) && 'undefined' !== typeof value.getDate;
}

export function isPrimitive(value: any): boolean {
    const type = typeof value;
    return value == null || (type !== 'object' && type !== 'function');
}

export function isString(value: any): value is string {
    return typeof value === 'string';
}

export function isFunction(value: any): value is Callable {
    return typeof value === 'function';
}

export function isConstructor(value: any): value is Type {
    return (value && typeof value === 'function' && value.prototype && value.prototype.constructor) === value
        && value.name !== 'Object';
}

export function isType(value: any): value is Type {
    return isConstructor(value);
}

export function isInterface(obj: any, interFaceObject: { [key: string]: string }): boolean {
    if (!obj || typeof obj !== 'object' || isArray(obj) || !isObject(interFaceObject)) return false;
    const keys = Object.keys(interFaceObject);
    const hasOwnProperty = Object.prototype.hasOwnProperty;
    for (const key of keys) {
        let type = interFaceObject[key] || '';
        if (type.startsWith('*')) {
            type = type.substring(1);
            if (hasOwnProperty.call(obj, key) && getType(obj[key]) !== type) return false;
        } else if (!hasOwnProperty.call(obj, key) || getType(obj[key]) !== type) {
            return false;
        }
    }
    return true;
}

export function getValue(obj: any, key: string, defaultValue?: any, treeFallback: boolean = false): any {
    key = key || "";
    const keys = key.split(".");
    let curKey = "";
    do {
        curKey += keys.shift();
        if (isDefined(obj) && isDefined(obj[curKey]) && (typeof obj[curKey] === "object" || !keys.length)) {
            obj = obj[curKey];
            curKey = "";
        } else if (!keys.length) {
            defaultValue = typeof defaultValue == "undefined" ? key.replace(new RegExp(`${curKey}$`), `{${curKey}}`) : defaultValue;
            obj = treeFallback ? obj || defaultValue : defaultValue;
        } else {
            curKey += ".";
        }
    } while (keys.length);
    return obj;
}

export function promiseTimeout(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readDirRecursive(dir: string, skipDirs: string[] = [], base: string = ``): Promise<string[]> {
    base = base || dir;
    const dirName = dir.replace(base, '');
    if (skipDirs.includes(dirName)) {
        return [];
    }
    const files = await readdir(dir);
    const result: string[] = [];
    for (const file of files) {
        const path = join(dir, file).replace(/\\/g, '/');
        const fileStat = await stat(path);
        if (fileStat.isDirectory()) {
            result.push(...(await readDirRecursive(path, skipDirs, base)));
        } else {
            result.push(path.replace(base, ''));
        }
    }
    return result;
}

export function getEOL(text: string): string {
    const m = text.match(/\r\n|\n/g);
    const u = m && m.filter(a => a === '\n').length;
    const w = m && m.length - u;
    if (u === w) {
        return EOL; // use the OS default
    }
    return u > w ? '\n' : '\r\n';
}

function createAsyncOptionsProvider<T extends AsyncOptions>(
    token: InjectionToken, opts: IModuleOptionsProvider<T>
): AsyncOptionsProvider<T> {
    if (opts.useFactory) {
        return {
            provide: token,
            useFactory: opts.useFactory,
            inject: opts.inject || [],
        };
    }
    const inject = [
        (opts.useClass || opts.useExisting),
    ];
    return {
        provide: token,
        useFactory: async (factory: IModuleOptionsFactory<T>) => await factory.createOptions(),
        inject,
    };
}

export function createAsyncProviders<T extends AsyncOptions>(
    token: InjectionToken<T>, opts: IModuleOptionsProvider<T>
): AsyncProviders<T> {
    if (opts.useExisting || opts.useFactory) {
        return [createAsyncOptionsProvider(token, opts)];
    }
    const useClass = opts.useClass;
    return [
        createAsyncOptionsProvider(token, opts),
        {
            provide: useClass,
            useClass,
        },
    ];
}

export class FromOptionsProviders<O extends AsyncOptions> {

    protected providers: Provider[];

    constructor(protected token: FactoryToken<O>) {
        this.providers = [];
    }

    add(...providers: Provider[]) {
        this.providers.push(...providers);
        return this;
    }

    useValue<T>(provide: FactoryToken<T>, useFactory: FromOptionsFactory<O, T>) {
        return this.add({
            provide,
            useFactory,
            inject: [this.token, ModuleRef]
        });
    }

    useType<T>(provide: FactoryToken<T>, factory: FromOptionsFactory<O, Type<T>>) {
        return this.add({
            provide,
            useFactory: async (opts: O, moduleRef: ModuleRef) => {
                const type = await factory(opts);
                try {
                    // Try to use internal API-s
                    const link = moduleRef['instanceLinksHost'].get(type);
                    await link.wrapperRef.settlementSignal['settledPromise'];
                } catch (e) {
                    // Magic timeout
                    console.log('Using magic timeout', e);
                    await promiseTimeout(50);
                }
                return moduleRef.resolve(type, null, {strict: false});
            },
            inject: [this.token, ModuleRef]
        });
    }

    asArray(): Provider[] {
        return [...this.providers];
    }
}

export function createRootModule<O extends AsyncOptions, M extends Constructor<any>>(
    module: M,
    token: FactoryToken<O>,
    opts: O,
    providers: Provider[],
    global: boolean = true
): DynamicModule {
    return {
        providers: [
            {
                provide: token,
                useValue: opts || {}
            },
            ...providers
        ],
        exports: providers,
        module,
        global,
    };
}

export function createRootModuleAsync<O extends AsyncOptions, M extends Type>(
    module: M,
    token: FactoryToken<O>,
    opts: IModuleOptionsProvider<O>,
    providers: Provider[],
    global: boolean = true
): DynamicModule {
    return {
        providers: [
            ...createAsyncProviders(token, opts),
            ...providers
        ],
        exports: providers,
        module,
        global,
    };
}
