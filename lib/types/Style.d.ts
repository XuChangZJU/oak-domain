import { EntityDict } from './Entity';
import { EntityDict as BaseEntityDict } from '../base-app-domain';
type ThemeColor = 'default' | 'success' | 'warning' | 'error';
export type ColorDict<ED extends BaseEntityDict & EntityDict> = {
    [T in keyof ED]?: {
        [A in keyof ED[T]['OpSchema']]?: {
            [E in ED[T]['OpSchema'][A]]?: ThemeColor | `#${string}`;
        };
    };
};
export {};
