// Survive tab: price guide plus filterable tips.
import React from 'react';
import { Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { PRICE_GUIDE, PRICE_LAST_CHECKED } from '@/data/prices';
import { TIPS, TIP_CATEGORIES } from '@/data/tips';
import { Body, Card, Chip, F, H1, H2, Row, Screen } from '@/components/ui';

export default function Survive() {
  const c = useColors();
  const { tipCategory, setTipCategory } = useApp();
  const tips = tipCategory === 'All' ? TIPS : TIPS.filter((t) => t.category === tipCategory);
  return (
    <Screen>
      <H1>Survive</H1>
      <Card>
        <Text style={{ color: c.primary, fontFamily: F.b, fontSize: 12, letterSpacing: 1.5 }}>PRICE GUIDE</Text>
        {PRICE_GUIDE.map((p) => (
          <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <Body>{p.item}</Body>
            <Text style={{ color: c.accentForeground, fontFamily: F.b }}>{p.price}</Text>
          </View>
        ))}
        <Body muted style={{ fontSize: 12 }}>Estimates only. Last checked {PRICE_LAST_CHECKED}</Body>
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
