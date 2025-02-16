import { getValue, isDefined } from './misc';
import { Callable } from '../common-types';

export function interpolateString(expr: string, params?: any) {
    if (!expr || !params) return expr;
    return expr.replace(/{{\s?([^{}\s]*)\s?}}/g, (substring: string, b: string) => {
        const r = getValue(params, b);
        return isDefined(r) ? r : substring;
    });
}

export function interpolate(expr: string | Callable, params?: any): string {
    if (typeof expr === "string") {
        return interpolateString(expr, params);
    }
    if (typeof expr === "function") {
        return expr(params);
    }
    return expr as string;
}

export function escapeRegex(str: string): string {
    return str.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function toKeywords(str: string): string[] {
    return !str ? [] : `${str}`.split(',').map(s => s.trim()).filter(s => !!s);
}

export function stripTags(str: string): string {
    return str.replace(/<br>/g, '\n').replace(/(<([^>]+)>)/gi, '');
}
