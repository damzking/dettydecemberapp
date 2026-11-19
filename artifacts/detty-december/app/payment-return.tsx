import React, { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { confirmCheckout } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Body, Btn, H1, Screen } from '@/components/ui';

export default function PaymentReturn() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const auth = useAuth();
  const [status, setStatus] = useState('pending');
  useEffect(() => {
    let stopped = false;
    const deadline = Date.now() + 60000;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      if (!reference) { setStatus('missing'); return; }
      try {
        const result = await confirmCheckout(reference);
        if (stopped) return;
        if (result.status === 'success') {
          auth.acceptSession(result.session); router.replace('/'); return;
        }
        if (['failed', 'abandoned'].includes(result.status)) { setStatus(result.status); return; }
      } catch { /* Retry temporary network failures until the deadline. */ }
      if (stopped) return;
      if (Date.now() >= deadline) { setStatus('timeout'); return; }
      timer = setTimeout(check, 2000);
    }
    void check();
    return () => { stopped = true; clearTimeout(timer); };
  }, [reference]);
  const support = auth.supportWhatsappUrl ? new URL(auth.supportWhatsappUrl) : null;
  if (support) support.searchParams.set('text', `Hi, my Detty December payment is still confirming. Reference: ${reference}`);
  return <Screen showCity={false}>
    <H1>{status === 'pending' ? 'Confirming your payment...' : status === 'timeout' ? 'Still confirming' : 'Payment not completed'}</H1>
    <Body>{status === 'timeout' ? 'Still confirming. If you were charged, message us on WhatsApp with your reference.' :
      status === 'pending' ? 'Please wait while the server verifies your payment.' : 'No pass was granted for this payment.'}</Body>
    <Body>Reference: {reference || 'Missing reference'}</Body>
    {status === 'timeout' && support ? <Btn label="Message us on WhatsApp" onPress={() => { void Linking.openURL(support.href); }} /> : null}
    {status !== 'pending' ? <Btn label="Back to plans" onPress={() => router.replace('/pricing')} /> : null}
  </Screen>;
}
