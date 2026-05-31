import { useFoodStore } from '../../src/store/foodStore';
import type { MenuItem, Restaurant } from '../../src/types/food';

const mockRestaurant: Restaurant = {
  id: 'rest-1',
  name: 'Test Restaurant',
  cuisineTypes: ['Indian'],
  rating: 4.5,
  reviewCount: 100,
  deliveryTimeMinutes: 30,
  deliveryFee: 2.99,
  minimumOrder: 15,
  isOpen: true,
  address: '123 Test St',
  distanceKm: 1.0,
};

const mockItem: MenuItem = {
  id: 'item-1',
  categoryId: 'cat-1',
  name: 'Butter Chicken',
  description: 'Creamy curry',
  price: 14.99,
  allergens: ['dairy'],
  isAvailable: true,
};

describe('foodStore', () => {
  beforeEach(() => {
    useFoodStore.setState({
      activeRestaurant: null,
      cart: [],
      promoCode: '',
      deliveryAddress: '',
      deliveryInstructions: '',
      tip: 0,
    });
  });

  it('sets active restaurant and clears cart', () => {
    useFoodStore.getState().addToCart(mockItem, 2);
    useFoodStore.getState().setActiveRestaurant(mockRestaurant);
    expect(useFoodStore.getState().activeRestaurant?.id).toBe('rest-1');
    expect(useFoodStore.getState().cart).toHaveLength(0);
  });

  it('adds item to cart and computes subtotal', () => {
    useFoodStore.getState().addToCart(mockItem, 2);
    expect(useFoodStore.getState().cart).toHaveLength(1);
    expect(useFoodStore.getState().cartSubtotal()).toBeCloseTo(29.98);
    expect(useFoodStore.getState().cartItemCount()).toBe(2);
  });

  it('increases quantity if same item added again', () => {
    useFoodStore.getState().addToCart(mockItem, 1);
    useFoodStore.getState().addToCart(mockItem, 1);
    expect(useFoodStore.getState().cart).toHaveLength(1);
    expect(useFoodStore.getState().cart[0].quantity).toBe(2);
  });

  it('removes item from cart when quantity set to 0', () => {
    useFoodStore.getState().addToCart(mockItem, 1);
    const cartItemId = useFoodStore.getState().cart[0].id;
    useFoodStore.getState().updateQuantity(cartItemId, 0);
    expect(useFoodStore.getState().cart).toHaveLength(0);
  });

  it('normalizes promo code to uppercase', () => {
    useFoodStore.getState().setPromoCode('save20');
    expect(useFoodStore.getState().promoCode).toBe('SAVE20');
  });

  it('clears cart and resets state', () => {
    useFoodStore.getState().addToCart(mockItem, 3);
    useFoodStore.getState().setPromoCode('code');
    useFoodStore.getState().clearCart();
    expect(useFoodStore.getState().cart).toHaveLength(0);
    expect(useFoodStore.getState().promoCode).toBe('');
  });
});
