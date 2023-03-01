const ToCent: (float: number) => number = (float) => {
    return Math.round(float * 100);
}

const ToYuan: (int: number) => number = ( int) => {
    return Math.round(int) / 100;
}

const StringToCent: (value: string, allowNegative?: true) => number | undefined = (value, allowNegative) => {
    const numValue = parseInt(value, 10);
    if (typeof numValue === 'number' && (numValue >= 0 || allowNegative)) {
        return ToCent(numValue);
    }
}

const CentToString: (value: number) => string | undefined = (value) => {
    if (typeof value === 'number') {
        return `${ToYuan(value)}`;
    }
}

export {
    ToCent,
    ToYuan,
    StringToCent,
    CentToString,
}