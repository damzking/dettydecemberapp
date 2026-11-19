// Ideas tab: city switch, category chips and idea cards.
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { CATEGORIES, CITIES, IDEAS, Idea } from '@/data/ideas';
import { Body, Btn, Card, Chip, F, H1, Row, Screen } from '@/components/ui';

function IdeaCard({ idea }: { idea: Idea }) {
  const c = useColors();
  const { saved, toggleSaved, showToast } = useApp();
  const added = saved.includes(idea.id);
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: c.primary, fontFamily: F.b, fontSize: 11, letterSpacing: 1.2 }}>{idea.category.toUpperCase()}</Text>
        <Text style={{ color: c.mutedForeground, fontFamily: F.m, fontSize: 12 }}>{idea.area} · {idea.priceLevel}</Text>
      </View>
      <Text style={{ color: c.foreground, fontFamily: F.b, fontSize: 18 }}>{idea.title}</Text>
      <Body muted>{idea.blurb}</Body>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Feather name="check-circle" size={12} color={c.primary} />
        <Text style={{ color: c.accentForeground, fontFamily: F.m, fontSize: 12 }}>Verified {idea.verified}</Text>
      </View>
      {idea.seller === 'Tix' ? (
        <View style={{ gap: 6, padding: 12, borderRadius: 12, backgroundColor: c.muted }}>
          <Btn label="Get tickets on Tix" icon="external-link" variant="outline" onPress={() => showToast('Demo: ticket link opens Tix in a later version.')} />
          <Body muted style={{ fontSize: 12 }}>Official ticket link · checked {idea.verified}</Body>
          <Body muted style={{ fontSize: 12 }}>You leave this app to buy. The seller handles payment and refunds, not us.</Body>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Pressable onPress={() => showToast('Thank you. Your report has been noted (demo).')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12 }}>
          <Feather name="flag" size={14} color={c.mutedForeground} />
          <Text style={{ color: c.mutedForeground, fontFamily: F.m, fontSize: 13 }}>Report a problem</Text>
        </Pressable>
        <Btn style={{ flex: 1, paddingVertical: 10 }} variant={added ? 'ghost' : 'primary'} icon={added ? 'check' : 'plus'}
          label={added ? 'Added' : 'Add to plan'}
          onPress={() => { toggleSaved(idea.id); showToast(added ? 'Removed from your plan.' : 'Added to your plan.'); }} />
      </View>
    </Card>
  );
}

export default function Ideas() {
  const c = useColors();
  const { city, setCity, ideaCategory, setIdeaCategory, saved } = useApp();
  const list = IDEAS.filter((i) => i.city === city && (ideaCategory === 'All' || i.category === ideaCategory));
  return (
    <Screen>
      <H1>Ideas</H1>
      <View style={{ flexDirection: 'row', backgroundColor: c.secondary, borderRadius: 999, padding: 4 }}>
        {CITIES.map((ct) => (
          <Pressable key={ct} onPress={() => setCity(ct)} style={{ flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center', backgroundColor: city === ct ? c.primary : 'transparent' }}>
            <Text style={{ color: city === ct ? c.primaryForeground : c.foreground, fontFamily: F.b }}>{ct}</Text>
          </Pressable>
        ))}
      </View>
      <Row>
        <Chip label="All" active={ideaCategory === 'All'} onPress={() => setIdeaCategory('All')} />
        {CATEGORIES.map((cat) => <Chip key={cat} label={cat} active={ideaCategory === cat} onPress={() => setIdeaCategory(cat)} />)}
      </Row>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Body muted>{list.length} ideas in {city}</Body>
        <Text style={{ color: c.primary, fontFamily: F.s, fontSize: 14 }}>{saved.length} saved to plan</Text>
      </View>
      {list.map((i) => <IdeaCard key={i.id} idea={i} />)}
    </Screen>
  );
}
