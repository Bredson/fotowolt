import { Pressable, StyleSheet, Text, View } from "react-native";
import { VOIVODESHIPS, toggleVoivodeship } from "../voivodeships";

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
  single?: boolean;
};

export function VoivodeshipPicker({ selected, onChange, single = false }: Props) {
  return (
    <View style={styles.list}>
      {VOIVODESHIPS.map((code) => {
        const isSelected = selected.includes(code);
        return (
          <Pressable
            key={code}
            style={[styles.row, isSelected && styles.rowSelected]}
            onPress={() => onChange(single ? [code] : toggleVoivodeship(selected, code))}
          >
            <Text style={styles.rowText}>
              {isSelected ? "☑" : "☐"} {code}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4 },
  row: { padding: 10, borderRadius: 6, backgroundColor: "#f2f2f2" },
  rowSelected: { backgroundColor: "#d9f0e0" },
  rowText: { fontSize: 15 },
});
