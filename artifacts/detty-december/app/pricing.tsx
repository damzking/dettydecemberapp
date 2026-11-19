// Pricing paywall: the only screen until a pass is chosen.
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { PASSES, Pass } from '@/data/passes';
import { Body, Btn, Card, F, H1, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

const INCLUDED = ['Plan quiz and day-by-day suggestions', 'Lagos and Abuja ideas list', 'Survive tips and price guide', 'Ask a local guidance line'];

export default function Pricing() {
  const c = useColors();
  const { ready, hasPass, buyPass, showToast } = useApp();
  const [choice, setChoice] = useState<Pass['id']>('week');
  const { user } = useAuth();
  const [paying, setPaying] = useState(false);
  if (!ready) return null;
  if (!user) return <Redirect href="/signin" />;
  if (hasPass) return <Redirect href="/" />;
  const pass = PASSES.find((p) => p.id === choice)!;

  const pay = async () => {
    if (paying) return;
    setPaying(true);
    try {
      await buyPass(choice);
      showToast(`Demo payment accepted. ${pass.name} unlocked.`);
      router.replace('/');
    } catch (error) {
      const message = error && typeof error === 'object' && 'data' in error
        ? (error.data as { error?: string })?.error : undefined;
      showToast(message ?? 'Could not grant a pass. Please try again.');
    } finally { setPaying(false); }
  };

  return (
    <Screen showCity={false}>
      <Text style={{ color: c.primary, fontFamily: F.b, fontSize: 12, letterSpacing: 2 }}>DETTY DECEMBER GUIDE</Text>
      <H1>Unlock your Detty December</H1>
      <View style={{ gap: 10 }}>
        {PASSES.map((p) => {
          const on = p.id === choice;
          return (
            <Pressable key={p.id} testID={`pass-${p.id}`} onPress={() => setChoice(p.id)} style={({ pressed }) => [{
              flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 18, borderWidth: 2,
              borderColor: on ? c.primary : c.border, backgroundColor: on ? c.accent : c.card, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} /> : null}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: c.foreground, fontFamily: F.b, fontSize: 18 }}>{p.name}</Text>
                <Body muted>{p.length}</Body>
                {p.note ? <Text style={{ color: c.primary, fontFamily: F.s, fontSize: 12 }}>{p.note}</Text> : null}
              </View>
              <Text style={{ color: c.primary, fontFamily: F.b, fontSize: 30 }}>${p.price}</Text>
            </Pressable>
          );
        })}
      </View>
      <Card>
        <Text style={{ color: c.foreground, fontFamily: F.b, fontSize: 15 }}>What is included</Text>
        {INCLUDED.map((i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Feather name="check" size={16} color={c.primary} /><Body>{i}</Body>
          </View>
        ))}
      </Card>
      <Btn testID="pay" label={paying ? 'Please wait…' : `Pay $${pass.price} and unlock`} onPress={() => { void pay(); }} />
      <Body muted style={{ fontSize: 12, textAlign: 'center' }}>One-time payment for the days you choose. No auto-renewal. [Refund policy goes here]</Body>
      <Body muted style={{ fontSize: 11, textAlign: 'center' }}>Demo only: no real payment is taken.</Body>
    </Screen>
  );
}
