import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { api, type AppNotification } from "../api";
import { useSession } from "../session";

export function NotificationList() {
  const { user } = useSession();
  const [items, setItems] = useState<AppNotification[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      api<AppNotification[]>("/notifications", { userId: user.id })
        .then(setItems)
        .catch(() => {});
    }, [user]),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        ListEmptyComponent={<Text style={styles.empty}>Brak powiadomień.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.message}</Text>
            <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString("pl-PL")}</Text>
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
  meta: { color: "#666", fontSize: 12 },
});
