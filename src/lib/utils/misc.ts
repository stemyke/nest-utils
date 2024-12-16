import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { EOL } from 'os';
import { Type } from '@nestjs/common';

export function isNullOrUndefined(value: any): boolean {
    return value == null || typeof value == 'undefined';
}

export function isDefined(value: any): boolean {
    return !isNullOrUndefined(value);
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

export function isFunction(value: any): value is Function {
    return typeof value === 'function';
}

export function isConstructor(value: any): boolean {
    return (value && typeof value === 'function' && value.prototype && value.prototype.constructor) === value && value.name !== 'Object';
}

export function isType(value: any): value is Type {
    return isConstructor(value);
}

export function isInterface(obj: any, interFaceObject: { [key: string]: string }): boolean {
    if (!obj || typeof obj !== 'object' || isArray(obj) || !isObject(interFaceObject)) return false;
    const keys = Object.keys(interFaceObject);
    for (const key of keys) {
        let type = interFaceObject[key] || '';
        if (type.startsWith('*')) {
            type = type.substr(1);
            if (obj.hasOwnProperty(key) && getType(obj[key]) !== type) return false;
        } else if (!obj.hasOwnProperty(key) || getType(obj[key]) !== type) {
            return false;
        }
    }
    return true;
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
