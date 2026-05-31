export type Restaurant = {
  id: string;
  name: string;
  cuisineTypes: string[];
  rating: number;
  reviewCount: number;
  deliveryTimeMinutes: number;
  deliveryFee: number;
  minimumOrder: number;
  imageUrl?: string;
  isOpen: boolean;
  address: string;
  distanceKm: number;
  isFeatured?: boolean;
  promotionBadge?: string;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  rating?: number;
  allergens: string[];
  isAvailable: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  items: MenuItem[];
};

export type CartItem = {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
  subtotal: number;
};

export type FoodOrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'driver_picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export type FoodOrder = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  tip: number;
  total: number;
  status: FoodOrderStatus;
  estimatedDeliveryMinutes: number;
  placedAt: string;
  deliveryAddress: string;
  promoCode?: string;
  discount?: number;
};
