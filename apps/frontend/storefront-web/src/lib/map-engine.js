export function clusterShops(shops, thresholdKm = 1.5) {
    const clusters = [];
    shops.forEach((shop) => {
        const existing = clusters.find((cluster) => getDistanceKm({ lat: cluster.lat, lng: cluster.lng }, shop) <= thresholdKm);
        if (!existing) {
            clusters.push({
                id: `cluster-${clusters.length + 1}`,
                lat: shop.lat,
                lng: shop.lng,
                count: 1,
                shops: [shop],
            });
            return;
        }
        existing.shops.push(shop);
        existing.count = existing.shops.length;
        existing.lat = average(existing.shops.map((item) => item.lat));
        existing.lng = average(existing.shops.map((item) => item.lng));
    });
    return clusters;
}
export function getDistanceKm(from, to) {
    const rad = Math.PI / 180;
    const dLat = (to.lat - from.lat) * rad;
    const dLng = (to.lng - from.lng) * rad;
    const lat1 = from.lat * rad;
    const lat2 = to.lat * rad;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
export function computeBounds(shops) {
    if (!shops.length) {
        return { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
    }
    return {
        minLat: Math.min(...shops.map((shop) => shop.lat)),
        maxLat: Math.max(...shops.map((shop) => shop.lat)),
        minLng: Math.min(...shops.map((shop) => shop.lng)),
        maxLng: Math.max(...shops.map((shop) => shop.lng)),
    };
}
export async function detectCurrentLocation() {
    if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.geolocation) {
        return null;
    }
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition((position) => resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
        }), () => resolve(null), { enableHighAccuracy: true, timeout: 6000, maximumAge: 300000 });
    });
}
function average(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}
