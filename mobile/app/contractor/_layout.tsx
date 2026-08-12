import { Redirect, Stack } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api, type User } from "../../src/api";
import { HelpButton } from "../../src/components/HelpButton";
import { useSession } from "../../src/session";

export default function ContractorLayout() {
  const { user, loading, login, logout } = useSession();
  if (loading) return null;
  if (!user || user.role !== "CONTRACTOR") return <Redirect href="/" />;

  if (user.status !== "APPROVED") {
    const refresh = async () => {
      try {
        const fresh = await api<User>("/auth/me", { userId: user.id });
        await login(fresh);
      } catch {
        // ignore — user can retry
      }
    };
    return (
      <View style={styles.pending}>
        <Text style={styles.pendingTitle}>
          {user.status === "PENDING"
            ? "Twoje zgłoszenie czeka na akceptację zleceniodawcy."
            : "Twoje zgłoszenie zostało odrzucone."}
        </Text>
        {user.status === "PENDING" && (
          <Pressable style={styles.button} onPress={refresh}>
            <Text style={styles.buttonText}>Sprawdź ponownie</Text>
          </Pressable>
        )}
        <HelpButton />
        <Pressable onPress={logout}>
          <Text style={styles.logout}>Wyloguj</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerRight: () => <HelpButton /> }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="order/[id]" options={{ title: "Szczegóły zlecenia" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  pending: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },
  pendingTitle: { fontSize: 16, textAlign: "center" },
  button: { backgroundColor: "#1a7a3a", borderRadius: 8, padding: 12, paddingHorizontal: 24 },
  buttonText: { color: "#fff", fontWeight: "600" },
  logout: { color: "#c00" },
});
