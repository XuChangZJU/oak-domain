/**
 * 计算地球上两点之间的球面距离
 */
export function getDistanceBetweenPoints(lat1: number, lon1: number, lat2: number, lon2: number) {    
	// 转为弧度
	function toRadians(d: number) {
		return d * Math.PI / 180;
	}	

	const R = 6378137; // 地球长半径
	const φ1 = toRadians(lat1);
	const φ2 = toRadians(lat2);
	const Δφ = toRadians(lat2 - lat1);
	const Δλ = toRadians(lon2 - lon1);

	const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
	        Math.cos(φ1) * Math.cos(φ2) *
	        Math.sin(Δλ/2) * Math.sin(Δλ/2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

	const d = R * c;

	return d * 1000;
}