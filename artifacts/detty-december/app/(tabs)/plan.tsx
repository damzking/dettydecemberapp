// Plan tab: quiz, persona card, saved picks and suggested days.
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { QuizAnswers, useApp } from '@/context/AppContext';
import { CATEGORIES, CITIES, Category, City } from '@/data/ideas';
import { useGuideData } from '@/context/GuideDataContext';
import { Body, Btn, Card, Chip, F, H1, H2, Row, Screen } from '@/components/ui';

const LENGTHS = ['A weekend', 'One week', 'Two weeks or more'];
const BUDGETS = ['Easy', 'Middle', 'Splash out'];
const DAYS: Record<string, number> = { 'A weekend': 2, 'One week': 4, 'Two weeks or more': 6 };

// Pick a persona name from the main vibe.
const PERSONAS: Record<Category, string> = {
  Coffee: '[The Slow Sipper]', Parties: '[The Night Owl]', Sports: '[The Match Day Regular]', Events: '[The Front Row Fan]',
};

export default function Plan() {
  const c = useColors();
  const { quiz, setQuiz, saved, toggleSaved, showToast, city: currentCity } = useApp();
  const { ideas } = useGuideData();
  const [editing, setEditing] = useState(!quiz);
  const [city, setCity] = useState<City>(quiz?.city ?? currentCity);
  const [length, setLength] = useState(quiz?.length ?? LENGTHS[0]);
  const [vibes, setVibes] = useState<Category[]>(quiz?.vibes ?? []);
  const [budget, setBudget] = useState(quiz?.budget ?? BUDGETS[1]);

  const toggleVibe = (v: Category) => setVibes((vs) => (vs.includes(v) ? vs.filter((x) => x !== v) : [...vs, v]));

  const build = () => {
    if (vibes.length === 0) { showToast('Pick at least one vibe.'); return; }
    const q: QuizAnswers = { city, length, vibes, budget };
    setQuiz(q);
    setEditing(false);
    showToast('Your plan is ready.');
  };

  const picks = ideas.filter((i) => saved.includes(i.id));

  // Suggested days: ideas in the chosen city matching vibes, minus saved ones, two per day.
  const days: { day: number; items: typeof ideas }[] = [];
  if (quiz) {
    const pool = ideas.filter((i) => i.city === quiz.city && !saved.includes(i.id))
      .sort((a, b) => Number(quiz.vibes.includes(b.category)) - Number(quiz.vibes.includes(a.category)));
    const n = DAYS[quiz.length] ?? 2;
    for (let d = 0; d < n && d * 2 < pool.length; d++) days.push({ day: d + 1, items: pool.slice(d * 2, d * 2 + 2) });
  }

  return (
    <Screen needsGuide>
      <H1>Your plan</H1>
      {editing || !quiz ? (
        <Card>
          <Text style={{ color: c.foreground, fontFamily: F.b, fontSize: 15 }}>Where are you going?</Text>
          <Row>{CITIES.map((x) => <Chip key={x} label={x} active={city === x} onPress={() => setCity(x)} />)}</Row>
          <Text style={{ color: c.foreground, fontFamily: F.b, fontSize: 15, marginTop: 6 }}>How long?</Text>
          <Row>{LENGTHS.map((x) => <Chip key={x} label={x} active={length === x} onPress={() => setLength(x)} />)}</Row>
          <Text style={{ color: c.foreground, fontFamily: F.b, fontSize: 15, marginTop: 6 }}>Vibes (pick any)</Text>
          <Row>{CATEGORIES.map((x) => <Chip key={x} label={x} active={vibes.includes(x)} onPress={() => toggleVibe(x)} />)}</Row>
          <Text style={{ color: c.foreground, fontFamily: F.b, fontSize: 15, marginTop: 6 }}>Budget</Text>
          <Row>{BUDGETS.map((x) => <Chip key={x} label={x} active={budget === x} onPress={() => setBudget(x)} />)}</Row>
          <Btn style={{ marginTop: 10 }} label="Build my plan" onPress={build} testID="build-plan" />
        </Card>
      ) : (
        <Card gold>
          <Text style={{ color: c.primaryForeground, fontFamily: F.b, fontSize: 11, letterSpacing: 2 }}>YOUR DETTY PERSONA</Text>
          <Text style={{ color: c.primaryForeground, fontFamily: F.b, fontSize: 28 }}>{PERSONAS[quiz.vibes[0]]}</Text>
          <Text style={{ color: c.primaryForeground, fontFamily: F.m, fontSize: 14 }}>
            {quiz.length} in {quiz.city}, {quiz.budget.toLowerCase()} budget.
          </Text>
          <Row>{quiz.vibes.map((v) => (
            <View key={v} style={{ borderWidth: 1, borderColor: c.primaryForeground, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: c.primaryForeground, fontFamily: F.s, fontSize: 12 }}>{v}</Text>
            </View>
          ))}</Row>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <Pressable onPress={() => showToast('Demo: sharing your card comes in a later version.')} style={{ flex: 1, backgroundColor: c.primaryForeground, padding: 12, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: c.primary, fontFamily: F.b }}>Share my card</Text>
            </Pressable>
            <Pressable onPress={() => setEditing(true)} style={{ flex: 1, borderWidth: 1.5, borderColor: c.primaryForeground, padding: 12, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: c.primaryForeground, fontFamily: F.b }}>Edit answers</Text>
            </Pressable>
          </View>
        </Card>
      )}

      <H2>Your picks</H2>
      {picks.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Feather name="bookmark" size={26} color={c.primary} />
          <Body muted style={{ textAlign: 'center' }}>Nothing added yet. Add ideas and they will show up here.</Body>
          <Btn label="Browse ideas" variant="outline" onPress={() => router.navigate('/ideas')} />
        </Card>
      ) : picks.map((p) => (
        <Card key={p.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: c.foreground, fontFamily: F.b, fontSize: 15 }}>{p.title}</Text>
            <Body muted style={{ fontSize: 12 }}>{p.city} · {p.category} · {p.area}</Body>
          </View>
          <Pressable onPress={() => { toggleSaved(p.id); showToast('Removed from your plan.'); }} style={{ padding: 10 }}>
            <Text style={{ color: c.destructive, fontFamily: F.s }}>Remove</Text>
          </Pressable>
        </Card>
      ))}

      {quiz && !editing ? (
        <>
          <H2>Suggested days</H2>
          {days.length === 0 ? <Body muted>You have picked everything in {quiz.city}. Nice.</Body> : days.map((d) => (
            <Card key={d.day}>
              <Text style={{ color: c.primary, fontFamily: F.b, fontSize: 12, letterSpacing: 1.5 }}>DAY {d.day}</Text>
              {d.items.map((i) => (
                <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary }} />
                  <Body style={{ flex: 1 }}>{i.title}</Body>
                  <Text style={{ color: c.mutedForeground, fontFamily: F.m, fontSize: 12 }}>{i.category}</Text>
                </View>
              ))}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
