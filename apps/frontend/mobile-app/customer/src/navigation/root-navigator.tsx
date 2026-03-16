import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthScreen } from "../screens/auth-screen";
import { CartScreen } from "../screens/cart-screen";
import { CheckoutScreen } from "../screens/checkout-screen";
import { OrderTrackingScreen } from "../screens/order-tracking-screen";
import { ProductBrowsingScreen } from "../screens/product-browsing-screen";
import { SearchResultsScreen } from "../screens/search-results-screen";
import { LiveChatScreen } from "../screens/live-chat-screen";
import { ShopSelectScreen } from "../screens/shop-select-screen";
import { HomeScreen } from "../screens/home-screen";

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="ShopSelect" component={ShopSelectScreen} />
      <Stack.Screen name="Browse" component={ProductBrowsingScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="LiveChat" component={LiveChatScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
    </Stack.Navigator>
  );
}
