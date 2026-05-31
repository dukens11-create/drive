import type { FoodDeliveryRequest, LatLng } from '../../types/drive';

const downtown: LatLng = { latitude: 37.7749, longitude: -122.4194 };

const restaurantNames = ['Spice Garden', 'Dragon Palace', 'La Bella Italia', 'Taco Fiesta'];
const restaurantAddresses = ['123 Main St', '456 Oak Ave', '789 Pine Rd', '321 Elm St'];
const customerAddresses = ['10 Union Square', '25 Market St', '87 Valencia St', '99 Mission St'];
const itemSets = [
  [{ name: 'Butter Chicken', quantity: 1 }, { name: 'Naan (2)', quantity: 1 }],
  [{ name: 'Dim Sum Set', quantity: 2 }, { name: 'Fried Rice', quantity: 1 }],
  [{ name: 'Margherita Pizza', quantity: 1 }],
  [{ name: 'Taco Combo', quantity: 3 }, { name: 'Guacamole', quantity: 1 }],
];
const estimatedEarnings = [8.5, 7.25, 9.0, 6.75];
const estimatedTimes = [22, 18, 28, 16];

export const buildFoodDeliveryRequests = (): FoodDeliveryRequest[] =>
  restaurantNames.map((name, index) => ({
    id: `food-delivery-${index + 1}`,
    restaurantName: name,
    restaurantAddress: restaurantAddresses[index],
    restaurantPosition: {
      latitude: downtown.latitude + 0.005 * (index + 1),
      longitude: downtown.longitude - 0.008 * index,
    },
    customerName: `Customer ${index + 1}`,
    customerAddress: customerAddresses[index],
    customerPosition: {
      latitude: downtown.latitude - 0.006 * (index + 1),
      longitude: downtown.longitude + 0.007 * index,
    },
    items: itemSets[index],
    estimatedPickupDistanceKm: 0.5 + index * 0.3,
    estimatedDeliveryDistanceKm: 1.2 + index * 0.5,
    estimatedEarnings: estimatedEarnings[index],
    estimatedTimeMinutes: estimatedTimes[index],
    expiresAt: Date.now() + 25_000,
  }));
