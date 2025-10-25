/**
 * Pricing utilities for parcel delivery cost calculation
 * Prices in FCFA (West African CFA franc)
 */

// Base pricing configuration (FCFA)
const PRICING_CONFIG = {
  BASE_FEE: 500, // Frais de base par colis
  PRICE_PER_KM: 100, // Prix par kilomètre
  PRICE_PER_KG: 50, // Prix par kilogramme
  PRICE_PER_DESTINATION: 200, // Prix par destination supplémentaire

  // Parcel type multipliers
  PARCEL_TYPE_MULTIPLIERS: {
    light: 1.0, // 0-5kg
    medium: 1.2, // 5-15kg (+20%)
    ultra_heavy: 1.5 // 15kg+ (+50%)
  },

  // Delivery type adjustments
  EXPRESS_MULTIPLIER: 1.5, // Express = +50%
  MAX_GROUPED_DISCOUNT: 0.3, // Max 30% discount for grouped
  MIN_WAITING_HOURS: 2, // Minimum wait time for grouped
  MAX_WAITING_HOURS: 24, // Maximum wait time for grouped
  DISCOUNT_PER_HOUR: 0.05, // 5% discount per hour of waiting
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return Math.round(distance * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculate total distance for multiple destinations
 */
export function calculateTotalDistance(
  pickupCoords: { latitude: number; longitude: number },
  deliveryCoords: Array<{ latitude: number; longitude: number }>
): number {
  let totalDistance = 0

  // Distance from pickup to first delivery
  if (deliveryCoords.length > 0) {
    const firstDelivery = deliveryCoords[0]
    if (firstDelivery) {
      totalDistance += calculateDistance(
        pickupCoords.latitude,
        pickupCoords.longitude,
        firstDelivery.latitude,
        firstDelivery.longitude
      )
    }
  }

  // Distance between delivery points
  for (let i = 1; i < deliveryCoords.length; i++) {
    const prevDelivery = deliveryCoords[i - 1]
    const currentDelivery = deliveryCoords[i]
    if (prevDelivery && currentDelivery) {
      totalDistance += calculateDistance(
        prevDelivery.latitude,
        prevDelivery.longitude,
        currentDelivery.latitude,
        currentDelivery.longitude
      )
    }
  }

  return Math.round(totalDistance * 100) / 100
}

/**
 * Calculate parcel delivery cost
 */
export function calculateDeliveryCost(params: {
  parcelType: 'light' | 'medium' | 'ultra_heavy'
  weight?: number
  deliveryType: 'grouped' | 'express'
  waitingHours?: number
  distance: number // in kilometers
  destinationCount: number
}): {
  baseCost: number
  finalCost: number
  savingsAmount: number
  breakdown: {
    baseFee: number
    distanceCost: number
    weightCost: number
    destinationCost: number
    parcelTypeMultiplier: number
    deliveryTypeAdjustment: number
    discount: number
  }
} {
  const {
    parcelType,
    weight = 0,
    deliveryType,
    waitingHours = 0,
    distance,
    destinationCount
  } = params

  // Calculate base components
  const baseFee = PRICING_CONFIG.BASE_FEE
  const distanceCost = distance * PRICING_CONFIG.PRICE_PER_KM
  const weightCost = weight * PRICING_CONFIG.PRICE_PER_KG
  const destinationCost = Math.max(0, destinationCount - 1) * PRICING_CONFIG.PRICE_PER_DESTINATION

  // Calculate base cost before multipliers
  let baseCost = baseFee + distanceCost + weightCost + destinationCost

  // Apply parcel type multiplier
  const parcelTypeMultiplier = PRICING_CONFIG.PARCEL_TYPE_MULTIPLIERS[parcelType]
  baseCost *= parcelTypeMultiplier

  // Calculate final cost based on delivery type
  let finalCost = baseCost
  let deliveryTypeAdjustment = 0
  let discount = 0
  let savingsAmount = 0

  if (deliveryType === 'express') {
    // Express delivery: +50%
    deliveryTypeAdjustment = baseCost * (PRICING_CONFIG.EXPRESS_MULTIPLIER - 1)
    finalCost = baseCost * PRICING_CONFIG.EXPRESS_MULTIPLIER
  } else {
    // Grouped delivery: discount based on waiting hours
    const clampedWaitingHours = Math.max(
      PRICING_CONFIG.MIN_WAITING_HOURS,
      Math.min(waitingHours, PRICING_CONFIG.MAX_WAITING_HOURS)
    )

    // Calculate discount: 5% per hour, max 30%
    discount = Math.min(
      (clampedWaitingHours / 6) * PRICING_CONFIG.MAX_GROUPED_DISCOUNT,
      PRICING_CONFIG.MAX_GROUPED_DISCOUNT
    )

    deliveryTypeAdjustment = -(baseCost * discount)
    finalCost = baseCost * (1 - discount)

    // Calculate savings compared to express
    const expressCost = baseCost * PRICING_CONFIG.EXPRESS_MULTIPLIER
    savingsAmount = expressCost - finalCost
  }

  // Round to nearest 10 FCFA
  finalCost = Math.ceil(finalCost / 10) * 10
  savingsAmount = Math.floor(savingsAmount / 10) * 10

  return {
    baseCost: Math.round(baseCost),
    finalCost,
    savingsAmount,
    breakdown: {
      baseFee,
      distanceCost: Math.round(distanceCost),
      weightCost: Math.round(weightCost),
      destinationCost,
      parcelTypeMultiplier,
      deliveryTypeAdjustment: Math.round(deliveryTypeAdjustment),
      discount
    }
  }
}

/**
 * Format price to FCFA string
 */
export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('fr-TG')} FCFA`
}

/**
 * Calculate estimated delivery time in minutes
 */
export function calculateEstimatedDeliveryTime(
  distance: number,
  deliveryType: 'grouped' | 'express',
  waitingHours?: number
): number {
  const averageSpeedKmh = 40 // Average speed in Lomé
  const baseTimeMinutes = (distance / averageSpeedKmh) * 60

  // Add time per stop
  const timePerStopMinutes = 10
  const totalTimeMinutes = baseTimeMinutes + timePerStopMinutes

  if (deliveryType === 'grouped' && waitingHours) {
    // Add waiting time
    return Math.round(totalTimeMinutes + waitingHours * 60)
  }

  return Math.round(totalTimeMinutes)
}
