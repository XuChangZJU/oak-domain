"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OakError = void 0;
var tslib_1 = require("tslib");
var OakError = /** @class */ (function (_super) {
    tslib_1.__extends(OakError, _super);
    function OakError(level, def, message) {
        var _this = _super.call(this, message ? message : def && def[1]) || this;
        _this.$$level = level;
        _this.$$code = def && def[0];
        return _this;
    }
    return OakError;
}(Error));
exports.OakError = OakError;
