import { Tabs } from "expo-router";
import { HelpButton } from "../../../src/components/HelpButton";

export default function ClientTabs() {
  return (
    <Tabs screenOptions={{ headerRight: () => <HelpButton /> }}>
      <Tabs.Screen name="orders" options={{ title: "Zlecenia" }} />
      <Tabs.Screen name="new-order" options={{ title: "Nowe zlecenie" }} />
      <Tabs.Screen name="contractors" options={{ title: "Wykonawcy" }} />
      <Tabs.Screen name="notifications" options={{ title: "Powiadomienia" }} />
    </Tabs>
  );
}
