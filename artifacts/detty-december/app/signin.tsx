import React, { useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSignIn, useSignUp } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { Body, Btn, F, H1, Screen } from '@/components/ui';

export default function SignInScreen() {
  const c = useColors();
  const auth = useAuth();
  const login = useSignIn();
  const register = useSignUp();
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [again, setAgain] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const pending = login.isPending || register.isPending;
  const support = auth.supportWhatsappUrl;

  const submit = async () => {
    if (pending) return;
    setError('');
    if (signup && email.trim().toLowerCase() !== again.trim().toLowerCase()) {
      setError('The email addresses must match.'); return;
    }
    if (signup && password.length < 10) {
      setError('Use a password with at least 10 characters.'); return;
    }
    try {
      const session = signup
        ? await register.mutateAsync({ data: { email, emailAgain: again, password } })
        : await login.mutateAsync({ data: { email, password } });
      setPassword('');
      auth.acceptSession(session);
    } catch (failure) {
      const data = failure && typeof failure === 'object' && 'data' in failure
        ? failure.data as { error?: string } : undefined;
      setError(data?.error ?? 'Unable to connect. Please try again.');
    }
  };

  if (!auth.ready) return null;
  if (auth.user) return <Redirect href={auth.user.isAdmin || auth.pass ? '/' : '/pricing'} />;
  const inputStyle = {
    color: c.foreground, fontFamily: F.r, fontSize: 16, backgroundColor: c.card,
    borderWidth: 1, borderColor: c.border, borderRadius: c.radius, padding: 15,
  };
  return (
    <Screen showCity={false}>
      <Text style={{ color: c.primary, fontFamily: F.b, fontSize: 12, letterSpacing: 2 }}>DETTY DECEMBER GUIDE</Text>
      <H1>{signup ? 'Create your account' : 'Welcome back'}</H1>
      <Body muted>{signup ? 'Sign up to choose your pass.' : 'Sign in to your Detty December guide.'}</Body>
      <View style={{ gap: 10 }}>
        <Body>Email</Body>
        <TextInput testID="auth-email" accessibilityLabel="Email" value={email} onChangeText={setEmail}
          autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email"
          textContentType="emailAddress" style={inputStyle} maxLength={254} />
        {signup ? <>
          <Body>Type your email again</Body>
          <TextInput testID="auth-email-again" accessibilityLabel="Type your email again" value={again} onChangeText={setAgain}
            autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="off"
            style={inputStyle} maxLength={254} />
        </> : null}
        <Body>Password</Body>
        <TextInput testID="auth-password" accessibilityLabel="Password" value={password} onChangeText={setPassword}
          secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={72}
          autoComplete={signup ? 'new-password' : 'current-password'}
          textContentType={signup ? 'newPassword' : 'password'} onSubmitEditing={() => { void submit(); }} style={inputStyle} />
        {signup ? <Body muted>At least 10 characters. Maximum 72 UTF-8 bytes.</Body> : null}
      </View>
      {error ? <Text accessibilityRole="alert" style={{ color: c.destructive, fontFamily: F.m }}>{error}</Text> : null}
      {auth.unavailable ? <Body muted>Could not check your session. Try signing in or check your connection.</Body> : null}
      <Btn testID="auth-submit" label={pending ? 'Please wait…' : signup ? 'Create account' : 'Sign in'} onPress={() => { void submit(); }} />
      <Btn testID="auth-toggle" variant="outline" label={signup ? 'Already registered? Sign in' : 'Create an account'}
        onPress={() => { if (!pending) { setSignup(!signup); setError(''); setPassword(''); } }} />
      {!signup ? (
        <Pressable accessibilityRole={support ? 'link' : 'text'} onPress={() => { if (support) void Linking.openURL(support); }}>
          <Body muted>Forgot your password? Message us on WhatsApp {support ? '' : '[LINK]'}</Body>
        </Pressable>
      ) : null}
    </Screen>
  );
}
