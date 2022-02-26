/// <reference types="react" />
import { TextProps, InputProps, TextareaProps, TapEvent, InputEvent, ButtonProps } from 'remax/one';
export declare function Text(props: Exclude<TextProps, 'onTap'> & {
    onClick?: (evt: TapEvent) => void;
    value: string | number;
}): JSX.Element;
export declare function Textarea(props: Exclude<TextareaProps, 'onInput' | 'value'> & {
    onChange?: (evt: InputEvent) => void;
    value: string;
}): JSX.Element;
export declare function Button(props: Exclude<ButtonProps, 'onTap'> & {
    onClick?: (evt: TapEvent) => void;
    children: any;
}): JSX.Element;
export declare function Input(props: Exclude<InputProps, 'onInput' | 'value'> & {
    onChange?: (evt: InputEvent) => void;
    value?: string;
}): JSX.Element;
