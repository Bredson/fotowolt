import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { api, type BidStatus, type MyBid } from "../../../src/api";
import { useSession } from "../../../src/session";

const STATUS_LABEL: Record<BidStatus, string> = {
  PENDING: "Oczekuje na decyzję",
  ACCEPTED: "Wybrano Cię do realizacji",
  REJECTED: "Wybrano innego wykonawcę",
};

export default function MyBidsScreen() {
  const { user } = useSession();
  const [bids, setBids] = useState<MyBid[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      api<MyBid[]>("/bids/mine", { userId: user.id }).then(setBids).catch(() => {});
    }, [user]),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={bids}
        keyExtractor={(b) => b.id}
        ListEmptyComponent={<Text style={styles.empty}>Nie zgłosiłeś jeszcze żadnej gotowości.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {item.order.kw} kW — {item.order.voivodeship}
            </Text>
            <Text numberOfLines={1}>{item.order.description}</Text>
            <Text
              style={[
                styles.status,
                item.status === "ACCEPTED" && styles.statusAccepted,
                item.status === "REJECTED" && styles.statusRejected,
              ]}
            >
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  empty: { textAlign: "center", color: "#777", marginTop: 40 },
  card: { backgroundColor: "#f7f7f7", borderRadius: 8, padding: 14, marginBottom: 10, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  status: { fontSize: 13, color: "#b8860b" },
  statusAccepted: { color: "#1a7a3a" },
  statusRejected: { color: "#c0392b" },
});
