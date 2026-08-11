import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, type User } from "../../../src/api";
import { CONTRACTOR_STATUS_LABEL } from "../../../src/contractorStatus";
import { VoivodeshipPicker } from "../../../src/components/VoivodeshipPicker";
import { useSession } from "../../../src/session";

export default function ContractorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [contractor, setContractor] = useState<User | null>(null);
  const [voivodeships, setVoivodeships] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const load = useCallback(() => {
    if (!user || !id) return;
    api<User[]>("/contractors", { userId: user.id })
      .then((all) => {
        const found = all.find((c) => c.id === id) ?? null;
        setContractor(found);
        if (found && !isDirty) setVoivodeships(found.voivodeships);
      })
      .catch(() => {});
  }, [user, id, isDirty]);

  useFocusEffect(useCallback(() => load(), [load]));

  const setStatus = async (action: "approve" | "reject") => {
    try {
      await api(`/contractors/${id}/${action}`, { method: "POST", userId: user!.id });
      setIsDirty(false);
      load();
    } catch {
      Alert.alert("Błąd", "Nie udało się zmienić statusu.");
    }
  };

  const saveVoivodeships = async () => {
    if (voivodeships.length === 0) {
      Alert.alert("Błąd", "Wykonawca musi mieć co najmniej jedno województwo.");
      return;
    }
    try {
      await api(`/contractors/${id}/voivodeships`, {
        method: "PATCH",
        userId: user!.id,
        body: { voivodeships },
      });
      Alert.alert("Zapisano", "Obszar działania zaktualizowany.");
      setIsDirty(false);
      load();
    } catch {
      Alert.alert("Błąd", "Nie udało się zapisać województw.");
    }
  };

  if (!contractor) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{contractor.companyName}</Text>
      <Text>
        {contractor.contactName} · {contractor.phone}
      </Text>
      <Text style={styles.meta}>{contractor.email}</Text>
      <Text style={styles.meta}>Status: {CONTRACTOR_STATUS_LABEL[contractor.status]}</Text>

      {contractor.status === "PENDING" && (
        <View style={styles.actions}>
          <Pressable style={styles.button} onPress={() => setStatus("approve")}>
            <Text style={styles.buttonText}>Zaakceptuj</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.buttonDanger]} onPress={() => setStatus("reject")}>
            <Text style={styles.buttonText}>Odrzuć</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.section}>Obszar działania</Text>
      <VoivodeshipPicker selected={voivodeships} onChange={(next) => { setVoivodeships(next); setIsDirty(true); }} />
      <Pressable style={styles.button} onPress={saveVoivodeships}>
        <Text style={styles.buttonText}>Zapisz województwa</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: "bold" },
  meta: { color: "#666", fontSize: 13 },
  section: { fontSize: 16, fontWeight: "600", marginTop: 16 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  button: { backgroundColor: "#1a7a3a", borderRadius: 8, padding: 12, alignItems: "center", flexGrow: 1, marginTop: 8 },
  buttonDanger: { backgroundColor: "#c0392b" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
