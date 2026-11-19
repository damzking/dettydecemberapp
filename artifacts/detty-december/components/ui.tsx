// Small shared building blocks used across screens.
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';

export const F = { r: 'Inter_400Regular', m: 'Inter_500Medium', s: 'Inter_600SemiBold', b: 'Inter_700Bold' };

// Scrollable page with safe-area top padding and room for the tab bar.
export function Screen({ children, showCity = true }: { children: React.ReactNode; showCity?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { city, hasPass } = useApp();
  const top = Platform.OS === 'web' ? 67 : insets.top + 12;
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAwareScrollViewCompat bottomOffset={80} contentContainerStyle={[s.page, { paddingTop: top }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        {showCity && hasPass ? (
          <View style={[s.cityPill, { borderColor: c.border }]}>
            <Feather name="map-pin" size={12} color={c.primary} />
            <Text style={{ color: c.accentForeground, fontFamily: F.s, fontSize: 12 }}>{city}</Text>
          </View>
        ) : null}
        {children}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={{ color: c.foreground, fontFamily: F.b, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 }}>{children}</Text>;
}
export function H2({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={{ color: c.foreground, fontFamily: F.b, fontSize: 19, marginTop: 8 }}>{children}</Text>;
}
export function Body({ children, muted, style }: { children: React.ReactNode; muted?: boolean; style?: object }) {
  const c = useColors();
  return <Text style={[{ color: muted ? c.mutedForeground : c.foreground, fontFamily: F.r, fontSize: 14, lineHeight: 20 }, style]}>{children}</Text>;
}

// Gold (primary) or outlined button with a press-scale microinteraction.
export function Btn({ label, onPress, variant = 'primary', icon, style, testID }: {
  label: string; onPress: () => void; variant?: 'primary' | 'outline' | 'ghost'; icon?: keyof typeof Feather.glyphMap; style?: ViewStyle; testID?: string;
}) {
  const c = useColors();
  const bg = variant === 'primary' ? c.primary : variant === 'outline' ? 'transparent' : c.secondary;
  const fg = variant === 'primary' ? c.primaryForeground : c.accentForeground;
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [
      s.btn, { backgroundColor: bg, borderColor: variant === 'outline' ? c.primary : 'transparent', borderRadius: c.radius, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}>
      {icon ? <Feather name={icon} size={16} color={fg} /> : null}
      <Text style={{ color: fg, fontFamily: F.b, fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.chip, {
      backgroundColor: active ? c.primary : c.secondary, borderColor: active ? c.primary : c.border, transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
      <Text style={{ color: active ? c.primaryForeground : c.foreground, fontFamily: F.s, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style, gold }: { children: React.ReactNode; style?: ViewStyle; gold?: boolean }) {
  const c = useColors();
  return <View style={[s.card, { backgroundColor: gold ? c.primary : c.card, borderColor: gold ? c.primary : c.border, borderRadius: c.radius + 4 }, style]}>{children}</View>;
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>;
}

// Toast banner shown at the bottom of every screen.
export function Toast() {
  const c = useColors();
  const { toast } = useApp();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: toast ? 1 : 0, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [toast, anim]);
  if (!toast) return null;
  return (
    <Animated.View pointerEvents="none" style={[s.toast, { backgroundColor: c.accentForeground, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
      <Feather name="info" size={16} color={c.primaryForeground} />
      <Text style={{ color: c.primaryForeground, fontFamily: F.s, fontSize: 14, flex: 1 }}>{toast}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingBottom: 140, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },
  cityPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1.5 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  card: { padding: 16, borderWidth: 1, gap: 8 },
  toast: { position: 'absolute', left: 20, right: 20, bottom: 110, maxWidth: 600, alignSelf: 'center', flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: 14 },
});
