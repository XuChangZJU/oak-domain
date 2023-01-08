"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedule = void 0;
var tslib_1 = require("tslib");
var cronjs_matcher_1 = require("@datasert/cronjs-matcher");
var dayjs_1 = tslib_1.__importDefault(require("dayjs"));
function schedule(cron, fn) {
    var futureMatches = (0, cronjs_matcher_1.getFutureMatches)(cron, {
        matchCount: 1,
    });
    var date = (0, dayjs_1.default)(futureMatches[0]);
    var interval = date.diff((0, dayjs_1.default)(), 'ms');
    setTimeout(function () {
        fn(new Date());
        schedule(cron, fn);
    }, interval);
}
exports.schedule = schedule;
