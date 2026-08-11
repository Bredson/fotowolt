import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { api, type Order } from "../../../src/api";
import { useSession } from "../../../src/session";

export default function ClientOrdersScreen() {
  const { user, logout } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      api<Order[]>("/orders", { userId: user.id }).then(setOrders).catch(() => {});
    }, [user]),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        ListEmptyComponent={<Text style={styles.empty}>Brak zleceń. Dodaj pierwsze w zakładce „Nowe zlecenie”.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/client/order/${item.id}`)}>
            <Text style={styles.cardTitle}>
              {item.kw} kW — {item.voivodeship}
            </Text>
            <Text numberOfLines={1}>{item.description}</Text>
            <Text style={styles.cardMeta}>
              {item.status === "OPEN"
                ? `Otwarte · zgłoszenia: ${item.pendingBidCount ?? 0}`
                : "Wykonawca wybrany"}
            </Text>
          </Pressable>
        )}
      />
      <Pressable onPress={logout}>
        <Text style={styles.logout}>Wyloguj ({user?.email})</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  empty: { textAlign: "center", color: "#777", marginTop: 40 },
  card: { backgroundColor: "#f7f7f7", borderRadius: 8, padding: 14, marginBottom: 10, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardMeta: { color: "#1a7a3a", fontSize: 13 },
  logout: { textAlign: "center", color: "#c00", padding: 12 },
});
