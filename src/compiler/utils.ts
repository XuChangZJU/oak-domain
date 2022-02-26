export function firstLetterLowerCase(s: string) {
    return s.slice(0, 1).toLowerCase().concat(s.slice(1));
}