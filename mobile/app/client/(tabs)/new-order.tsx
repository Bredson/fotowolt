import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { api, type Order } from "../../../src/api";
import { VoivodeshipPicker } from "../../../src/components/VoivodeshipPicker";
import { useSession } from "../../../src/session";

export default function NewOrderScreen() {
  const { user } = useSession();
  const router = useRouter();
  const [kw, setKw] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [voivodeship, setVoivodeship] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    const kwNumber = Number(kw.replace(",", "."));
    if (!Number.isFinite(kwNumber) || kwNumber <= 0) {
      setError("Podaj wielkość zlecenia w kW (liczba większa od 0).");
      return;
    }
    if (!description.trim() || !address.trim() || voivodeship.length !== 1) {
      setError("Wypełnij opis, adres i zaznacz województwo.");
      return;
    }
    setBusy(true);
    try {
      await api<Order>("/orders", {
        method: "POST",
        userId: user!.id,
        body: { kw: kwNumber, description, address, voivodeship: voivodeship[0] },
      });
      setKw("");
      setDescription("");
      setAddress("");
      setVoivodeship([]);
      router.push("/client/(tabs)/orders");
    } catch {
      setError("Nie udało się dodać zlecenia.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Wielkość zlecenia (kW)</Text>
      <TextInput style={styles.input} value={kw} onChangeText={setKw} keyboardType="decimal-pad" placeholder="np. 9,9" />
      <Text style={styles.label}>Opis</Text>
      <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline />
      <Text style={styles.label}>Adres</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="ulica, kod, miejscowość" />
      <Text style={styles.label}>Województwo</Text>
      <VoivodeshipPicker selected={voivodeship} onChange={setVoivodeship} single />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.button} onPress={handleSubmit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? "Dodawanie..." : "Dodaj zlecenie"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  error: { color: "#c00", marginTop: 8 },
  button: { backgroundColor: "#1a7a3a", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 16 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
