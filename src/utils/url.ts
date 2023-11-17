import URL from 'url';

export function composeUrl(url: string, params: Record<string, any>) {
    const urlSp = new URL.URLSearchParams(params);
    if (url.includes('?')) {
        return `${url}&${urlSp}`;
    }
    return `${url}?${urlSp}`;
}