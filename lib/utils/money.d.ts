declare const ToCent: (float: number) => number;
declare const ToYuan: (int: number) => number;
declare const StringToCent: (value: string, allowNegative?: true) => number | undefined;
declare const CentToString: (value: number) => string | undefined;
declare const ThousandCont: (value: number) => string | undefined;
export { ToCent, ToYuan, StringToCent, CentToString, ThousandCont };
