import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, Text } from "react-native";

import { StackHeaderGradient } from "../components/StackHeaderGradient";
import { useTheme } from "../context/ThemeContext";
import { AuthScreen } from "../screens/AuthScreen";
import { ThemeSettingsScreen } from "../screens/ThemeSettingsScreen";
import type { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="Auth"
      screenOptions={{
        contentStyle: { backgroundColor: "transparent" },
        headerBackground: () => <StackHeaderGradient />,
        headerStyle: { backgroundColor: "transparent" },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { color: colors.textPrimary, fontWeight: "800" },
        headerShadowVisible: false,
        headerBlurEffect: undefined,
      }}
    >
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={({ navigation }) => ({
          title: "",
          headerTransparent: true,
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate("ThemeSettings")}
              hitSlop={12}
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <Text
                style={{
                  color: colors.accentSoft,
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                Tema
              </Text>
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="ThemeSettings"
        component={ThemeSettingsScreen}
        options={{
          title: "Aparência",
        }}
      />
    </Stack.Navigator>
  );
}
