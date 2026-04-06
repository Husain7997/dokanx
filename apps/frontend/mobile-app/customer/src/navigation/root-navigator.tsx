import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { HomeScreen } from "../screens/home-screen";

export type RootStackParamList = {
  Home: undefined;
  Auth: undefined;
  ShopSelect: undefined;
  Browse: undefined;
  MapDiscovery: undefined;
  SearchResults: undefined;
  LiveChat: undefined;
  Cart: undefined;
  Checkout: undefined;
  OrderTracking:
    | {
        orderId?: string;
        watchPayment?: boolean;
        paymentUrl?: string;
        paymentProvider?: string;
      }
    | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Auth" getComponent={() => require("../screens/auth-screen").AuthScreen} />
      <Stack.Screen name="ShopSelect" getComponent={() => require("../screens/shop-select-screen").ShopSelectScreen} />
      <Stack.Screen name="Browse" getComponent={() => require("../screens/product-browsing-screen").ProductBrowsingScreen} />
      <Stack.Screen name="MapDiscovery" getComponent={() => require("../screens/map-discovery-screen").MapDiscoveryScreen} />
      <Stack.Screen name="SearchResults" getComponent={() => require("../screens/search-results-screen").SearchResultsScreen} />
      <Stack.Screen name="LiveChat" getComponent={() => require("../screens/live-chat-screen").LiveChatScreen} />
      <Stack.Screen name="Cart" getComponent={() => require("../screens/cart-screen").CartScreen} />
      <Stack.Screen name="Checkout" getComponent={() => require("../screens/checkout-screen").CheckoutScreen} />
      <Stack.Screen name="OrderTracking" getComponent={() => require("../screens/order-tracking-screen").OrderTrackingScreen} />
    </Stack.Navigator>
  );
}
