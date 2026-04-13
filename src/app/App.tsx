import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

import { NavigationRoot } from "./NavigationRoot";

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NavigationRoot />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
