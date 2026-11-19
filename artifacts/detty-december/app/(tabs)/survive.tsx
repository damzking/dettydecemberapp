// Survive tab: price guide plus filterable tips.
import React from 'react';
import { Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { TIP_CATEGORIES } from '@/data/tips';
import { useGuideData } from '@/context/GuideDataContext';
import { Body, Card, Chip, F, H1, H2, Row, Screen } from '@/components/ui';

export default function Survive() {
  const c = useColors();
  const { tipCategory, setTipCategory } = useApp();
  const { tips: allTips, prices } = useGuideData();
  const tips = tipCategory === 'All' ? allTips : allTips.filter((t) => t.category === tipCategory);
  return (
    <Screen needsGuide>
      <H1>Survive</H1>
      <Card>
        <Text style={{ color: c.primary, fontFamily: F.b, fontSize: 12, letterSpacing: 1.5 }}>PRICE GUIDE</Text>
        {prices.map((p) => (
          <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <Body>{p.item}</Body>
            <Text style={{ color: c.accentForeground, fontFamily: F.b }}>{p.price}</Text>
          </View>
        ))}
        <Body muted style={{ fontSize: 12 }}>Estimates only. Last checked {prices[0]?.lastChecked ?? ''}</Body>
      </Card>
      <H2>Tips</H2>
      <Row>{TIP_CATEGORIES.map((t) => <Chip key={t} label={t} active={tipCategory === t} onPress={() => setTipCategory(t)} />)}</Row>
      {tips.map((t) => (
        <Card key={t.id} style={t.category === 'Scams' ? { borderLeftWidth: 4, borderLeftColor: c.destructive } : undefined}>
          <Text style={{ color: t.category === 'Scams' ? c.destructive : c.primary, fontFamily: F.b, fontSize: 11, letterSpacing: 1.2 }}>{t.category.toUpperCase()}</Text>
          <Text style={{ color: c.foreground, fontFamily: F.b, fontSize: 16 }}>{t.title}</Text>
          <Body muted>{t.body}</Body>
        </Card>
      ))}
    </Screen>
  );
}
