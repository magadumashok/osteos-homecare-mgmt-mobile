import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
import { initials } from "../utils/format";

/** Card row with a teal accent, avatar, title, meta lines and a trailing slot. */
export default function ListCard({ title, meta, badges, imageUri, onPress, trailing }) {
  const content = (
    <>
      <View style={styles.accent} />
      <View style={styles.avatar}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{initials(title)}</Text>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {(meta || []).filter(Boolean).map((line, index) => (
          <Text key={index} style={styles.meta} numberOfLines={1}>
            {line}
          </Text>
        ))}
        {!!badges?.length && (
          <View style={styles.badges}>
            {badges.filter(Boolean).map((badge, index) => (
              <View key={index} style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={20} color="#c0c8d0" /> : null)}
    </>
  );

  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {content}
    </Pressable>
  ) : (
    <View style={styles.card}>{content}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.borderSoft,
    overflow: "hidden",
    paddingVertical: 14,
    paddingRight: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  pressed: { opacity: 0.8 },
  accent: { width: 4, alignSelf: "stretch", backgroundColor: colors.primary, borderRadius: 4, marginRight: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#e1f5ee",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImage: { width: 46, height: 46 },
  avatarText: { color: colors.primary, fontSize: 16, fontWeight: "700" },
  body: { flex: 1, gap: 3 },
  title: { color: colors.text, fontSize: 15, fontWeight: "700" },
  meta: { color: colors.textMuted, fontSize: 12 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  badge: { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10, backgroundColor: colors.primarySoft },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.primary },
});
