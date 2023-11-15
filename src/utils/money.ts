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

const ThousandCont: (value: number, decimalPlaces?: number) => string | undefined = (value, decimalPlaces) => {
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
    if (decimalPlaces && decimalPlaces > 0) {
        if (numArr[1]) {
            const decimalPart = numArr[1].padEnd(decimalPlaces, '0').slice(0, decimalPlaces);
            result = result + '.' + decimalPart;     
        } else {
            result = result + '.' + '0'.repeat(decimalPlaces);
        }
    } else {
        result = numArr[1] ? result + '.' + numArr[1] : result;
    }
    return result;
};

export { ToCent, ToYuan, StringToCent, CentToString, ThousandCont };
