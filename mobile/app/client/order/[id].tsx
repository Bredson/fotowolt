import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, type BidForClient, type BidStatus, type OrderDetailClient } from "../../../src/api";
import { useSession } from "../../../src/session";

const BID_STATUS_LABEL: Record<BidStatus, string> = {
  PENDING: "Oczekuje",
  ACCEPTED: "Wybrany",
  REJECTED: "Odrzucony",
};

export default function ClientOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [order, setOrder] = useState<OrderDetailClient | null>(null);

  const load = useCallback(() => {
    if (!user || !id) return;
    api<OrderDetailClient>(`/orders/${id}`, { userId: user.id }).then(setOrder).catch(() => {});
  }, [user, id]);

  useFocusEffect(useCallback(() => load(), [load]));

  const handleAccept = (bid: BidForClient) => {
    Alert.alert(
      "Przydzielenie zlecenia",
      `Zlecić realizację firmie ${bid.contractor.companyName}? Pozostałe zgłoszenia zostaną odrzucone, a wykonawca dostanie powiadomienie.`,
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Zleć",
          onPress: async () => {
            try {
              await api(`/bids/${bid.id}/accept`, { method: "POST", userId: user!.id });
              load();
            } catch {
              Alert.alert("Błąd", "Nie udało się przydzielić zlecenia.");
            }
          },
        },
      ],
    );
  };

  if (!order) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {order.kw} kW — {order.voivodeship}
      </Text>
      <Text>{order.description}</Text>
      <Text style={styles.meta}>{order.address}</Text>
      <Text style={styles.meta}>
        Status: {order.status === "OPEN" ? "Otwarte" : "Wykonawca wybrany"}
      </Text>

      <Text style={styles.section}>Potwierdzili gotowość ({order.bids.length})</Text>
      {order.bids.length === 0 && <Text style={styles.empty}>Brak zgłoszeń gotowości.</Text>}
      {order.bids.map((bid) => (
        <View key={bid.id} style={styles.bidCard}>
          <Text style={styles.bidTitle}>{bid.contractor.companyName}</Text>
          <Text>
            {bid.contractor.contactName} · {bid.contractor.phone}
          </Text>
          <Text style={styles.meta}>{bid.contractor.email}</Text>
          <Text style={styles.meta}>Status: {BID_STATUS_LABEL[bid.status]}</Text>
          {order.status === "OPEN" && bid.status === "PENDING" && (
            <Pressable style={styles.button} onPress={() => handleAccept(bid)}>
              <Text style={styles.buttonText}>Zleć</Text>
            </Pressable>
          )}
        </View>
      ))}

      <Text style={styles.section}>Odrzucili ({order.declines.length})</Text>
      {order.declines.length === 0 && <Text style={styles.empty}>Nikt nie odrzucił zlecenia.</Text>}
      {order.declines.map((decline) => (
        <View key={decline.id} style={styles.bidCard}>
          <Text style={styles.bidTitle}>{decline.contractor.companyName}</Text>
          <Text style={styles.meta}>
            {decline.contractor.contactName} · {decline.contractor.email}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: "bold" },
  meta: { color: "#666", fontSize: 13 },
  section: { fontSize: 16, fontWeight: "600", marginTop: 16 },
  empty: { color: "#777" },
  bidCard: { backgroundColor: "#f7f7f7", borderRadius: 8, padding: 14, gap: 4, marginTop: 8 },
  bidTitle: { fontSize: 15, fontWeight: "600" },
  button: { backgroundColor: "#1a7a3a", borderRadius: 8, padding: 10, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
