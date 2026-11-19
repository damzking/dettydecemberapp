// Ask a local: sample chat (demo only, no live replies).
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { Body, Btn, Chip, F, H1, Row, Screen } from '@/components/ui';

interface Msg { id: string; from: 'me' | 'local'; text: string }

const HELPERS = ['Getting around', 'Prices', 'Safety', 'Where to go'];
const QUICK = ['[Quick question 1]', '[Quick question 2]', '[Quick question 3]'];

export default function Ask() {
  const c = useColors();
  const { showToast } = useApp();
  const [topic, setTopic] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 'm1', from: 'local', text: '[Sample greeting from a local guide]' },
    { id: 'm2', from: 'me', text: '[Sample visitor question]' },
    { id: 'm3', from: 'local', text: '[Sample local reply]' },
  ]);

  // Add the user's message, then a demo acknowledgement.
  const send = (body: string) => {
    const t = body.trim();
    if (!t) { showToast('Type a message first.'); return; }
    const now = Date.now().toString();
    setMsgs((m) => [...m,
      { id: now + 'a', from: 'me', text: t },
      { id: now + 'b', from: 'local', text: 'Demo only: message received, but live replies are not switched on yet.' }]);
    setText('');
  };

  return (
    <Screen>
      <H1>Ask a local</H1>
      <Body muted>Open [HOURS] Lagos time. Replies usually within [X] minutes. This line is for guidance, not emergencies.</Body>
      <Row>{HELPERS.map((h) => <Chip key={h} label={h} active={topic === h} onPress={() => { setTopic(h); showToast(`Topic set: ${h}`); }} />)}</Row>
      <View style={{ backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 14, gap: 10 }}>
        <Text style={{ color: c.mutedForeground, fontFamily: F.s, fontSize: 11, letterSpacing: 1.2, textAlign: 'center' }}>SAMPLE CHAT · DEMO</Text>
        {msgs.map((m) => (
          <View key={m.id} style={{ alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start', maxWidth: '82%', padding: 12, borderRadius: 16,
            backgroundColor: m.from === 'me' ? c.primary : c.secondary }}>
            <Text style={{ color: m.from === 'me' ? c.primaryForeground : c.foreground, fontFamily: F.m, fontSize: 14 }}>{m.text}</Text>
          </View>
        ))}
        <Row>{QUICK.map((q) => (
          <Pressable key={q} onPress={() => send(q)} style={{ borderWidth: 1, borderColor: c.primary, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: c.primary, fontFamily: F.s, fontSize: 12 }}>{q}</Text>
          </Pressable>
        ))}</Row>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput testID="chat-input" value={text} onChangeText={setText} placeholder="Type a message" placeholderTextColor={c.mutedForeground}
            onSubmitEditing={() => send(text)} returnKeyType="send"
            style={{ flex: 1, backgroundColor: c.input, color: c.foreground, fontFamily: F.r, fontSize: 15, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }} />
          <Pressable testID="send" onPress={() => send(text)} style={({ pressed }) => ({ backgroundColor: c.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', gap: 6, alignItems: 'center', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
            <Feather name="send" size={14} color={c.primaryForeground} />
            <Text style={{ color: c.primaryForeground, fontFamily: F.b }}>Send</Text>
          </Pressable>
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Btn label="Request a call" icon="phone" variant="outline" onPress={() => showToast('Demo: call requests are not live yet.')} />
        <Btn label="Open in WhatsApp" icon="message-square" variant="ghost" onPress={() => showToast('Demo: WhatsApp link is not connected yet.')} />
      </View>
    </Screen>
  );
}
