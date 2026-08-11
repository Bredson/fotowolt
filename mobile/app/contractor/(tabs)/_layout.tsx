import { Tabs } from "expo-router";

export default function ContractorTabs() {
  return (
    <Tabs>
      <Tabs.Screen name="orders" options={{ title: "Zlecenia" }} />
      <Tabs.Screen name="my-bids" options={{ title: "Moje zgłoszenia" }} />
      <Tabs.Screen name="notifications" options={{ title: "Powiadomienia" }} />
    </Tabs>
  );
}
