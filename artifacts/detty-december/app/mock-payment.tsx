import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { simulateCheckout } from '@workspace/api-client-react';
import { Body, Btn, H1, Screen } from '@/components/ui';
export default function MockPayment() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const [error, setError] = useState('');
  const simulate = async (status: 'success' | 'failed' | 'abandoned') => {
    try {
      await simulateCheckout(reference, { status });
      router.replace({ pathname: '/payment-return', params: { reference } });
    } catch { setError('Mock payments are disabled or this reference is not yours.'); }
  };
  return <Screen showCity={false}>
    <H1>Development test payment</H1>
    <Body>No real money is taken. You can also close this tab without choosing an outcome; the payment stays pending.</Body>
    <Body>Reference: {reference}</Body>
    <Btn label="Simulate success" onPress={() => { void simulate('success'); }} />
    <Btn label="Simulate decline" onPress={() => { void simulate('failed'); }} />
    <Btn label="Simulate abandoned checkout" onPress={() => { void simulate('abandoned'); }} />
    {error ? <Body>{error}</Body> : null}
  </Screen>;
}
