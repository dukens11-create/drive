import { Drawer } from 'expo-router/drawer';

export default function DrawerLayout() {
  return (
    <Drawer screenOptions={{ headerShown: false }}>
      <Drawer.Screen name="(tabs)" options={{ drawerLabel: 'Passenger Home' }} />
      <Drawer.Screen name="support" options={{ drawerLabel: 'Support' }} />
      <Drawer.Screen name="sos" options={{ drawerLabel: 'Emergency SOS' }} />
      <Drawer.Screen name="share-trip" options={{ drawerLabel: 'Share Trip' }} />
      <Drawer.Screen name="settings" options={{ drawerLabel: 'Settings' }} />
      <Drawer.Screen name="food-restaurant-detail" options={{ drawerLabel: 'Restaurant', drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="food-cart" options={{ drawerLabel: 'Cart', drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="food-checkout" options={{ drawerLabel: 'Checkout', drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="food-order-tracking" options={{ drawerLabel: 'Order Tracking', drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="promo-code" options={{ drawerLabel: 'Promo Code', drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="chat" options={{ drawerLabel: 'Chat', drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="payment-methods" options={{ drawerLabel: 'Payment Methods', drawerItemStyle: { display: 'none' } }} />
    </Drawer>
  );
}
