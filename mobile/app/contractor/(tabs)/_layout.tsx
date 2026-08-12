import { Tabs } from "expo-router";
import { HelpButton } from "../../../src/components/HelpButton";

export default function ContractorTabs() {
  return (
    <Tabs screenOptions={{ headerRight: () => <HelpButton /> }}>
      <Tabs.Screen name="orders" options={{ title: "Zlecenia" }} />
      <Tabs.Screen name="my-bids" options={{ title: "Moje zgłoszenia" }} />
      <Tabs.Screen name="notifications" options={{ title: "Powiadomienia" }} />
    </Tabs>
  );
}
