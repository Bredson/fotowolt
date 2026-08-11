import { Alert, Platform } from "react-native";

// react-native-web does not implement Alert — calls are a silent no-op there,
// so every dialog has to go through these helpers instead of Alert directly.

export function showMessage(title: string, message: string, onDismiss?: () => void) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    onDismiss?.();
    return;
  }
  Alert.alert(title, message, onDismiss ? [{ text: "OK", onPress: onDismiss }] : undefined);
}

export function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Anuluj", style: "cancel" },
    { text: confirmLabel, onPress: onConfirm },
  ]);
}
