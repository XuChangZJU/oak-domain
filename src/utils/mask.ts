const maskIdCard: (idCardNumber: string) => string = (idCardNumber) => {
    if(!idCardNumber as any instanceof String) {
        throw new Error("身份证号码必须是String类型");
    }
    let begin = idCardNumber.slice(0, 4);
    let end = idCardNumber.slice(idCardNumber.length - 4, 4);
    for(let i = 0; i < idCardNumber.length - 8; i ++) {
        begin = begin.concat("*");
    }
    return begin.concat(end);
}

const maskMobile: (mobile: string) => string = (mobile) => {
    let begin = mobile.slice(0, 3);
    let end = mobile.slice(7, 11);
    return begin.concat("****").concat(end);
}


const maskName: (name: string) => string = (name) => {
    return name.slice(0, name.length - 1).concat("*");
}

const maskStar: (str: string, front: number, end: number, star: string) => string = (str, frontLen, endLen, star = '*') => {
    const len = str.length - frontLen - endLen;
    let xing = '';
    for (let i = 0; i < len; i++) {
        xing += star;
    }
    return str.substring(0, frontLen) + xing + str.substring(str.length - endLen);
}



export {
    maskIdCard,
    maskMobile,
    maskName,
    maskStar,
}
