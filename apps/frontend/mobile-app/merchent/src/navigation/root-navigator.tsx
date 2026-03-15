import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { MerchantHomeScreen } from "../screens/merchant-home-screen";

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MerchantHome" component={MerchantHomeScreen} />
    </Stack.Navigator>
  );
}
