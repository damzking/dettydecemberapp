import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Redirect, Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView, SFSymbol } from 'expo-symbols';
import { useApp } from '@/context/AppContext';

// One list drives both tab styles.
const TABS: { name: string; title: string; sf: SFSymbol; sfOn: SFSymbol; icon: keyof typeof Feather.glyphMap }[] = [
  { name: 'index', title: 'Home', sf: 'house', sfOn: 'house.fill', icon: 'home' },
  { name: 'plan', title: 'Plan', sf: 'map', sfOn: 'map.fill', icon: 'map' },
  { name: 'survive', title: 'Survive', sf: 'shield', sfOn: 'shield.fill', icon: 'shield' },
  { name: 'ideas', title: 'Ideas', sf: 'sparkles', sfOn: 'sparkles', icon: 'compass' },
  { name: 'ask', title: 'Ask', sf: 'bubble.left', sfOn: 'bubble.left.fill', icon: 'message-circle' },
];

// iOS 26: native liquid glass tabs.
function NativeTabLayout() {
  return (
    <NativeTabs>
      {TABS.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Icon sf={{ default: t.sf, selected: t.sfOn }} />
          <NativeTabs.Trigger.Label>{t.title}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}

// Older iOS / Android / web: classic tabs in brand colours.
function ClassicTabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
            : <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />,
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{
          title: t.title,
          tabBarIcon: ({ color }) => isIOS
            ? <SymbolView name={t.sf} tintColor={String(color)} size={24} />
            : <Feather name={t.icon} size={22} color={String(color)} />,
        }} />
      ))}
    </Tabs>
  );
}

export default function TabLayout() {
  const { ready, hasPass } = useApp();
  // Gate: no tabs (and no tab routes) until a pass is chosen.
  if (!ready) return null;
  if (!hasPass) return <Redirect href="/pricing" />;
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
