import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, type OrderDetailContractor } from "../../../src/api";
import { useSession } from "../../../src/session";

export default function ContractorOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetailContractor | null>(null);

  const load = useCallback(() => {
    if (!user || !id) return;
    api<OrderDetailContractor>(`/orders/${id}`, { userId: user.id }).then(setOrder).catch(() => {});
  }, [user, id]);

  useFocusEffect(useCallback(() => load(), [load]));

  const handleBid = async () => {
    try {
      await api(`/orders/${id}/bids`, { method: "POST", userId: user!.id });
      Alert.alert("Wysłano", "Zgłoszono gotowość realizacji zlecenia.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Błąd", "Nie udało się zgłosić gotowości.");
    }
  };

  const handleDecline = async () => {
    try {
      await api(`/orders/${id}/decline`, { method: "POST", userId: user!.id });
      router.back();
    } catch {
      Alert.alert("Błąd", "Nie udało się odrzucić zlecenia.");
    }
  };

  if (!order) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {order.kw} kW — {order.voivodeship}
      </Text>
      <Text>{order.description}</Text>
      <Text style={styles.meta}>{order.address}</Text>

      {order.myBid ? (
        <Text style={styles.info}>
          {order.myBid.status === "PENDING" && "Zgłosiłeś gotowość — czekaj na decyzję zleceniodawcy."}
          {order.myBid.status === "ACCEPTED" && "Gratulacje! Zostałeś wybrany do realizacji tego zlecenia."}
          {order.myBid.status === "REJECTED" && "Zleceniodawca wybrał innego wykonawcę."}
        </Text>
      ) : order.status === "OPEN" ? (
        <View style={styles.actions}>
          <Pressable style={styles.button} onPress={handleBid}>
            <Text style={styles.buttonText}>Zgłoś gotowość</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.buttonDanger]} onPress={handleDecline}>
            <Text style={styles.buttonText}>Odrzuć</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.info}>Zlecenie nie jest już dostępne.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: "bold" },
  meta: { color: "#666", fontSize: 13 },
  info: { marginTop: 16, fontSize: 15, color: "#1a7a3a" },
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  button: { backgroundColor: "#1a7a3a", borderRadius: 8, padding: 14, alignItems: "center", flexGrow: 1 },
  buttonDanger: { backgroundColor: "#c0392b" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
