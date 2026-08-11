import { Tabs } from "expo-router";

export default function ClientTabs() {
  return (
    <Tabs>
      <Tabs.Screen name="orders" options={{ title: "Zlecenia" }} />
      <Tabs.Screen name="new-order" options={{ title: "Nowe zlecenie" }} />
      <Tabs.Screen name="contractors" options={{ title: "Wykonawcy" }} />
    </Tabs>
  );
}
