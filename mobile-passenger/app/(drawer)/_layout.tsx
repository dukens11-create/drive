import { Drawer } from 'expo-router/drawer';

const hiddenDrawerScreen = { drawerItemStyle: { display: 'none' as const } };

export default function DrawerLayout() {
  return (
    <Drawer screenOptions={{ headerShown: false }}>
      <Drawer.Screen name="(tabs)" options={{ drawerLabel: 'Passenger Home' }} />
      <Drawer.Screen name="support" options={{ drawerLabel: 'Support' }} />
      <Drawer.Screen name="sos" options={{ drawerLabel: 'Emergency SOS' }} />
      <Drawer.Screen name="share-trip" options={{ drawerLabel: 'Share Trip' }} />
      <Drawer.Screen name="settings" options={{ drawerLabel: 'Settings' }} />
      <Drawer.Screen name="restaurant-detail" options={hiddenDrawerScreen} />
      <Drawer.Screen name="food-cart" options={hiddenDrawerScreen} />
      <Drawer.Screen name="food-checkout" options={hiddenDrawerScreen} />
      <Drawer.Screen name="food-order-tracking" options={hiddenDrawerScreen} />
      <Drawer.Screen name="food-order-rating" options={hiddenDrawerScreen} />
    </Drawer>
  );
}
