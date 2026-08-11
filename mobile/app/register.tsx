import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { api, ApiError, type User } from "../src/api";
import { VoivodeshipPicker } from "../src/components/VoivodeshipPicker";

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [voivodeships, setVoivodeships] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email || !companyName || !contactName || !phone) {
      setError("Wypełnij wszystkie pola.");
      return;
    }
    if (voivodeships.length === 0) {
      setError("Zaznacz co najmniej jedno województwo — obszar działania jest wymagany.");
      return;
    }
    setBusy(true);
    try {
      await api<User>("/contractors/register", {
        method: "POST",
        body: { email, companyName, contactName, phone, voivodeships },
      });
      Alert.alert(
        "Zgłoszenie wysłane",
        "Twoje zgłoszenie czeka na akceptację zleceniodawcy. Po akceptacji zaloguj się tym adresem e-mail.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? "Ten adres e-mail jest już zarejestrowany."
          : "Nie udało się wysłać zgłoszenia. Spróbuj ponownie.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Adres e-mail</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Text style={styles.label}>Nazwa firmy</Text>
      <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} />
      <Text style={styles.label}>Osoba kontaktowa</Text>
      <TextInput style={styles.input} value={contactName} onChangeText={setContactName} />
      <Text style={styles.label}>Telefon</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Text style={styles.label}>Obszar działania (województwa)</Text>
      <VoivodeshipPicker selected={voivodeships} onChange={setVoivodeships} />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.button} onPress={handleSubmit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? "Wysyłanie..." : "Wyślij zgłoszenie"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  error: { color: "#c00", marginTop: 8 },
  button: { backgroundColor: "#1a7a3a", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 16 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
