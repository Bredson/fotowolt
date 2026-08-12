import { Stack } from "expo-router";
import { HelpButton } from "../src/components/HelpButton";
import { SessionProvider } from "../src/session";

export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false, headerRight: () => <HelpButton /> }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="register" options={{ headerShown: true, title: "Rejestracja firmy" }} />
      </Stack>
    </SessionProvider>
  );
}
