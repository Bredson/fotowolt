import { Link, Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api, ApiError, type User } from "../src/api";
import { HelpButton } from "../src/components/HelpButton";
import { useSession } from "../src/session";

export default function LoginScreen() {
  const { user, loading, login } = useSession();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) {
    return <Redirect href={user.role === "CLIENT" ? "/client/(tabs)/orders" : "/contractor/(tabs)/orders"} />;
  }

  const handleLogin = async () => {
    setError(null);
    setBusy(true);
    try {
      const logged = await api<User>("/auth/login", { method: "POST", body: { email } });
      await login(logged);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 404
          ? "Nie znaleziono konta dla tego adresu e-mail."
          : "Błąd logowania. Sprawdź połączenie z serwerem.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fotowolt</Text>
      <Text style={styles.subtitle}>Zaloguj się adresem e-mail</Text>
      <TextInput
        style={styles.input}
        placeholder="adres@email.pl"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.button} onPress={handleLogin} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? "Logowanie..." : "Zaloguj się"}</Text>
      </Pressable>
      <Link href="/register" style={styles.link}>
        Nie masz konta? Zarejestruj firmę wykonawczą
      </Link>
      <View style={styles.help}>
        <HelpButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 32, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 16, textAlign: "center", color: "#555" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  error: { color: "#c00" },
  button: { backgroundColor: "#1a7a3a", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", color: "#1a7a3a", marginTop: 8 },
  help: { alignItems: "center", marginTop: 4 },
});
