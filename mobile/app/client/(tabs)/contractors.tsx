import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { api, type User } from "../../../src/api";
import { CONTRACTOR_STATUS_LABEL } from "../../../src/contractorStatus";
import { useSession } from "../../../src/session";

export default function ContractorsScreen() {
  const { user } = useSession();
  const router = useRouter();
  const [contractors, setContractors] = useState<User[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      api<User[]>("/contractors", { userId: user.id }).then(setContractors).catch(() => {});
    }, [user]),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={contractors}
        keyExtractor={(c) => c.id}
        ListEmptyComponent={<Text style={styles.empty}>Brak zarejestrowanych wykonawców.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/client/contractor/${item.id}`)}>
            <Text style={styles.cardTitle}>{item.companyName}</Text>
            <Text style={styles.meta}>{item.email}</Text>
            <Text style={[styles.status, item.status === "PENDING" && styles.statusPending]}>
              {CONTRACTOR_STATUS_LABEL[item.status]}
            </Text>
          </Pressable>
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
  meta: { color: "#666", fontSize: 13 },
  status: { fontSize: 13, color: "#1a7a3a" },
  statusPending: { color: "#b8860b" },
});
