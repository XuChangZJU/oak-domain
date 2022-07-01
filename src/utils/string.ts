export function firstLetterLowerCase(s: string) {
    return s.slice(0, 1).toLowerCase().concat(s.slice(1));
}

export function firstLetterUpperCase(s: string) {
    return s.slice(0, 1).toUpperCase().concat(s.slice(1));
}