import { Redirect, Stack } from "expo-router";
import { useSession } from "../../src/session";

export default function ClientLayout() {
  const { user, loading } = useSession();
  if (loading) return null;
  if (!user || user.role !== "CLIENT") return <Redirect href="/" />;
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="order/[id]" options={{ title: "Szczegóły zlecenia" }} />
      <Stack.Screen name="contractor/[id]" options={{ title: "Wykonawca" }} />
    </Stack>
  );
}
