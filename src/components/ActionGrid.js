import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, tilePalettes } from "../theme";

/**
 * Two-column grid of quick-action tiles.
 * items: [{ id, title, subtitle, icon, palette, onPress }]
 */
export default function ActionGrid({ items }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const [card, iconBg, accent] = tilePalettes[item.palette] || tilePalettes.blue;
        return (
          <Pressable
            key={item.id}
            onPress={item.onPress}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            style={({ pressed }) => [styles.card, { backgroundColor: card }, pressed && styles.pressed]}
          >
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <Ionicons name={item.icon} size={30} color={accent} />
            </View>
            <Text style={[styles.title, { color: accent }]}>{item.title}</Text>
            {!!item.subtitle && <Text style={styles.subtitle}>{item.subtitle}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  card: {
    width: "48.5%",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 12, color: colors.textMuted, textAlign: "center", lineHeight: 17 },
});
