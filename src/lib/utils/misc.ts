import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { EOL } from 'os';

export function isString(value: any): value is string {
    return typeof value === "string";
}

export function isFunction(value: any): value is Function {
    return typeof value === "function";
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
