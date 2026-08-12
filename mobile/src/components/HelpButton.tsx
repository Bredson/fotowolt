import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CLIENT_HELP, CONTRACTOR_HELP, type HelpSection } from "../instructions";
import { useSession } from "../session";

// Header button available on every screen. The instructions are role-specific:
// a logged-in user sees only their own half, a visitor on the login/register
// screens sees both, because the role isn't known yet.
export function HelpButton() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);

  const parts: { heading: string | null; sections: HelpSection[] }[] =
    user?.role === "CLIENT"
      ? [{ heading: null, sections: CLIENT_HELP }]
      : user?.role === "CONTRACTOR"
        ? [{ heading: null, sections: CONTRACTOR_HELP }]
        : [
            { heading: "Firma wykonawcza", sections: CONTRACTOR_HELP },
            { heading: "Zleceniodawca", sections: CLIENT_HELP },
          ];

  const title =
    user?.role === "CLIENT"
      ? "Instrukcja — zleceniodawca"
      : user?.role === "CONTRACTOR"
        ? "Instrukcja — firma wykonawcza"
        : "Instrukcja";

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)} accessibilityRole="button">
        <Text style={styles.triggerText}>Instrukcja</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button">
                <Text style={styles.close}>Zamknij</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {parts.map((part) => (
                <View key={part.heading ?? "single"}>
                  {part.heading && <Text style={styles.partHeading}>{part.heading}</Text>}
                  {part.sections.map((section) => (
                    <View key={section.title} style={styles.section}>
                      <Text style={styles.sectionTitle}>{section.title}</Text>
                      {section.body.map((line) => (
                        <Text key={line} style={styles.line}>
                          {line}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              ))}
              <Text style={styles.footer}>
                Wersja demonstracyjna — logowanie odbywa się samym adresem e-mail, bez hasła. Nie
                wprowadzaj prawdziwych danych klientów ani firm.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { paddingHorizontal: 14, paddingVertical: 6 },
  triggerText: { color: "#1a7a3a", fontSize: 15, fontWeight: "600" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "100%",
    maxWidth: 560,
    maxHeight: "85%",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  cardTitle: { fontSize: 17, fontWeight: "700", flexShrink: 1 },
  close: { color: "#1a7a3a", fontSize: 15, fontWeight: "600" },
  scroll: { flexGrow: 0 },
  scrollContent: { padding: 16, gap: 4 },
  partHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a7a3a",
    marginTop: 8,
    marginBottom: 4,
  },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "600", marginBottom: 6 },
  line: { fontSize: 14, lineHeight: 20, color: "#333", marginBottom: 6 },
  footer: { fontSize: 12, color: "#777", marginTop: 8, lineHeight: 17 },
});
