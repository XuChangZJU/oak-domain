"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDistanceBetweenPoints = void 0;
/**
 * 计算地球上两点之间的球面距离
 */
function getDistanceBetweenPoints(lat1, lon1, lat2, lon2) {
    // 转为弧度
    function toRadians(d) {
        return d * Math.PI / 180;
    }
    var R = 6378137; // 地球长半径
    var φ1 = toRadians(lat1);
    var φ2 = toRadians(lat2);
    var Δφ = toRadians(lat2 - lat1);
    var Δλ = toRadians(lon2 - lon1);
    var a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d * 1000;
}
exports.getDistanceBetweenPoints = getDistanceBetweenPoints;
