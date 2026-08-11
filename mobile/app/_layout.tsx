import { Stack } from "expo-router";
import { SessionProvider } from "../src/session";

export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="register" options={{ headerShown: true, title: "Rejestracja firmy" }} />
      </Stack>
    </SessionProvider>
  );
}
