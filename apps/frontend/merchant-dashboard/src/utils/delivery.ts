interface Shop {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  deliveryBase: number;
  deliveryPerKm: number;
}

interface DeliveryCalculation {
  distance: number;
  baseFee: number;
  perKmFee: number;
  totalFee: number;
  shopId: string;
}

/**
 * Calculate delivery cost for a shop based on distance
 */
export function calculateDelivery(
  shop: Shop,
  customerLocation: { lat: number; lng: number },
  globalDeliveryFee: number = 50 // Admin-configured global fee
): DeliveryCalculation {
  // Calculate distance using Haversine formula approximation
  const distance = calculateDistance(shop.location, customerLocation);

  const baseFee = shop.deliveryBase;
  const perKmFee = distance * shop.deliveryPerKm;
  const shopDeliveryFee = baseFee + perKmFee;
  const totalFee = shopDeliveryFee + globalDeliveryFee;

  return {
    distance,
    baseFee,
    perKmFee,
    totalFee,
    shopId: shop.id,
  };
}

/**
 * Calculate distance between two points in kilometers
 */
function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate total delivery cost for multiple shops
 */
export function calculateMultiShopDelivery(
  shops: Shop[],
  customerLocation: { lat: number; lng: number },
  globalDeliveryFee: number = 50
): DeliveryCalculation[] {
  return shops.map(shop => calculateDelivery(shop, customerLocation, globalDeliveryFee));
}

/**
 * Get the most cost-effective delivery option
 */
export function getCheapestDeliveryOption(
  deliveryOptions: DeliveryCalculation[]
): DeliveryCalculation | null {
  if (deliveryOptions.length === 0) return null;
  return deliveryOptions.reduce((cheapest, current) =>
    current.totalFee < cheapest.totalFee ? current : cheapest
  );
}