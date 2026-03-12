function toRadians(value) {
  return (Number(value || 0) * Math.PI) / 180;
}

function calculateDistanceKm(origin = {}, target = {}) {
  if (
    !Number.isFinite(Number(origin.lat)) ||
    !Number.isFinite(Number(origin.lng)) ||
    !Number.isFinite(Number(target.lat)) ||
    !Number.isFinite(Number(target.lng))
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const dLat = toRadians(Number(target.lat) - Number(origin.lat));
  const dLng = toRadians(Number(target.lng) - Number(origin.lng));
  const lat1 = toRadians(Number(origin.lat));
  const lat2 = toRadians(Number(target.lat));

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((earthRadiusKm * c).toFixed(2));
}

function filterNearby(items = [], origin = {}, radiusKm = 10) {
  return items
    .map(item => ({
      ...item,
      distanceKm: calculateDistanceKm(origin, item.location || {}),
    }))
    .filter(item => item.distanceKm !== null && item.distanceKm <= Number(radiusKm || 10))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

module.exports = {
  calculateDistanceKm,
  filterNearby,
};
