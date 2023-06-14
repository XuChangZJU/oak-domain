const ToCent: (float: number) => number = (float) => {
    return Math.round(float * 100);
};

const ToYuan: (int: number) => number = (int) => {
    return Math.round(int) / 100;
};

const StringToCent: (
    value: string,
    allowNegative?: true
) => number | undefined = (value, allowNegative) => {
    const numValue = parseInt(value, 10);
    if (typeof numValue === 'number' && (numValue >= 0 || allowNegative)) {
        return ToCent(numValue);
    }
};

const CentToString: (value: number) => string | undefined = (value) => {
    if (typeof value === 'number') {
        return `${ToYuan(value)}`;
    }
};

const ThousandCont: (value: number) => string | undefined = (value) => {
    let value1 = `${value}`;
    const numArr = value1.split('.');
    value1 = numArr[0];
    let result = '';
    while (value1.length > 3) {
        result = ',' + value1.slice(-3) + result;
        value1 = value1.slice(0, value1.length - 3);
    }
    if (value1) {
        result = value1 + result;
    }
    result = result + '.' + numArr[1];
    return result;
};

export { ToCent, ToYuan, StringToCent, CentToString, ThousandCont };
