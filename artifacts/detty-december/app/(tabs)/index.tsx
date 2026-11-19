// Home tab.
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { PASSES } from '@/data/passes';
import { useGuideData } from '@/context/GuideDataContext';
import { Body, Btn, F, H1, Row, Screen } from '@/components/ui';

export default function Home() {
  const c = useColors();
  const { pass, showToast, setTipCategory, setIdeaCategory } = useApp();
  const { tips } = useGuideData();
  const passInfo = PASSES.find((p) => p.id === pass?.id);
  const hoursLeft = pass ? Math.max(0, Math.round((pass.expiresAt - Date.now()) / 3600000)) : 0;

  const badges: { label: string; icon: keyof typeof Feather.glyphMap; msg: string }[] = [
    { label: 'Verified listings', icon: 'check-circle', msg: 'Listings show the date they were last verified.' },
    { label: 'Price guide', icon: 'tag', msg: 'Find the price guide at the top of Survive.' },
    { label: 'Report a problem', icon: 'flag', msg: 'Thanks. Use Report a problem on any idea card.' },
  ];
  const tiles: { label: string; icon: keyof typeof Feather.glyphMap; go: () => void }[] = [
    { label: 'Survive', icon: 'shield', go: () => { setTipCategory('All'); router.navigate('/survive'); } },
    { label: 'Ideas', icon: 'compass', go: () => { setIdeaCategory('All'); router.navigate('/ideas'); } },
    { label: 'Sports', icon: 'activity', go: () => { setIdeaCategory('Sports'); router.navigate('/ideas'); } },
    { label: 'Ask a local', icon: 'message-circle', go: () => router.navigate('/ask') },
  ];

  return (
    <Screen needsGuide>
      <H1>December, sorted.</H1>
      <Body muted>Your pocket guide to Lagos and Abuja: what to do, what to pay, who to ask.</Body>
      <View style={{ gap: 10 }}>
        <Btn label="Build my plan" icon="map" onPress={() => router.navigate('/plan')} />
        <Btn label="Browse ideas" variant="outline" icon="compass" onPress={() => { setIdeaCategory('All'); router.navigate('/ideas'); }} />
      </View>
      <Row>
        {badges.map((b) => (
          <Pressable key={b.label} onPress={() => showToast(b.msg)} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: c.secondary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
            <Feather name={b.icon} size={12} color={c.primary} />
            <Text style={{ color: c.foreground, fontFamily: F.m, fontSize: 12 }}>{b.label}</Text>
          </Pressable>
        ))}
      </Row>
      <Pressable testID="pass-status" onPress={() => showToast(`${passInfo?.name ?? 'Pass'} active. About ${hoursLeft} hours left.`)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border }}>
        <Feather name="clock" size={18} color={c.primary} />
        <Text style={{ color: c.foreground, fontFamily: F.s, flex: 1 }}>{passInfo?.name ?? 'Pass'} active</Text>
        <Text style={{ color: c.mutedForeground, fontFamily: F.m, fontSize: 12 }}>{hoursLeft}h left</Text>
      </Pressable>
      <Pressable testID="scam-watch" onPress={() => { setTipCategory('Scams'); router.navigate('/survive'); }}
        style={({ pressed }) => ({ padding: 18, borderRadius: 18, backgroundColor: c.accent, borderLeftWidth: 4, borderLeftColor: c.destructive, gap: 6, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="alert-triangle" size={16} color={c.destructive} />
          <Text style={{ color: c.destructive, fontFamily: F.b, fontSize: 12, letterSpacing: 1.5 }}>SCAM WATCH</Text>
        </View>
        <Text style={{ color: c.foreground, fontFamily: F.b, fontSize: 17 }}>{tips.find((tip) => tip.category === 'Scams')?.title ?? ''}</Text>
        <Body muted style={{ fontSize: 12 }}>Tap to see all scam tips</Body>
      </Pressable>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {tiles.map((t) => (
          <Pressable key={t.label} onPress={t.go} style={({ pressed }) => ({ width: '48%', flexGrow: 1, padding: 16, gap: 18, borderRadius: 18, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
            <Feather name={t.icon} size={22} color={c.primary} />
            <Text style={{ color: c.foreground, fontFamily: F.b, fontSize: 16 }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
