"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Input = exports.Button = exports.Textarea = exports.Text = void 0;
const one_1 = require("remax/one");
const React = __importStar(require("react"));
function Text(props) {
    const { onClick, value, ...restProps } = props;
    return (<one_1.Text onTap={onClick} {...restProps}>
            {value}
        </one_1.Text>);
}
exports.Text = Text;
function Textarea(props) {
    const { onChange, value, ...restProps } = props;
    return (<one_1.Textarea onInput={onChange} value={value} {...restProps}/>);
}
exports.Textarea = Textarea;
function Button(props) {
    const { onClick, children, ...restProps } = props;
    return (<one_1.Button onTap={onClick} {...restProps}>
            {children}
        </one_1.Button>);
}
exports.Button = Button;
function Input(props) {
    const { onChange, value, ...restProps } = props;
    return (<one_1.Input onInput={onChange} value={value} {...restProps}/>);
}
exports.Input = Input;
