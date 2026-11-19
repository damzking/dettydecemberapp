// Passes come from the server. Only saved ideas and quiz answers stay on-device.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Pass } from '@/data/passes';
import { useAuth } from '@/context/AuthContext';
import { useGrantDemoPass } from '@workspace/api-client-react';
import { Category, City } from '@/data/ideas';
import { TipCategory } from '@/data/tips';

export interface QuizAnswers { city: City; length: string; vibes: Category[]; budget: string }
interface ActivePass { id: Pass['id']; expiresAt: number }

interface Stored { saved: string[]; quiz: QuizAnswers | null }

interface AppState {
  ready: boolean;
  pass: ActivePass | null;
  hasPass: boolean;
  buyPass: (id: Pass['id']) => Promise<void>;
  saved: string[];
  toggleSaved: (id: string) => void;
  quiz: QuizAnswers | null;
  setQuiz: (q: QuizAnswers | null) => void;
  city: City;
  setCity: (c: City) => void;
  ideaCategory: Category | 'All';
  setIdeaCategory: (c: Category | 'All') => void;
  tipCategory: TipCategory;
  setTipCategory: (c: TipCategory) => void;
  toast: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const demo = useGrantDemoPass();
  const storageKey = auth.user ? `detty-december-v3:${auth.user.id}` : null;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [data, setData] = useState<Stored>({ saved: [], quiz: null });
  const [city, setCity] = useState<City>('Lagos');
  const [ideaCategory, setIdeaCategory] = useState<Category | 'All'>('All');
  const [tipCategory, setTipCategory] = useState<TipCategory>('All');
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageLoaded = useRef(false);

  // Keep unread storage intact if loading fails, and tell the user.
  useEffect(() => {
    let cancelled = false;
    storageLoaded.current = false;
    setData({ saved: [], quiz: null });
    setCity('Lagos');
    setIdeaCategory('All');
    setTipCategory('All');
    if (!storageKey || !auth.user) { setLoadedKey(null); return; }
    const userId = auth.user.id;
    (async () => {
        let raw = await AsyncStorage.getItem(storageKey);
        // Attach legacy device-only saved content to the first signed-in owner.
        if (!raw && !(await AsyncStorage.getItem('detty-legacy-owner'))) {
          const legacy = await AsyncStorage.getItem('detty-december-v1');
          if (legacy) {
            await AsyncStorage.setItem('detty-legacy-owner', userId);
            raw = legacy;
          }
        }
        if (cancelled) return;
        if (!raw) { storageLoaded.current = true; return; }
        const parsed = JSON.parse(raw) as Stored;
        if (!Array.isArray(parsed.saved) || !parsed.saved.every((id) => typeof id === 'string')) {
          throw new Error('Invalid saved ideas');
        }
        setData({ saved: parsed.saved ?? [], quiz: parsed.quiz ?? null });
        if (parsed.quiz?.city) setCity(parsed.quiz.city);
        storageLoaded.current = true;
      })()
      .catch(() => showToast('Saved data could not be loaded. This session will not overwrite it.'))
      .finally(() => { if (!cancelled) setLoadedKey(storageKey); });
    return () => { cancelled = true; };
  }, [storageKey]);
  const ready = auth.ready && (!storageKey || loadedKey === storageKey);

  // Save whenever data changes (after first load).
  useEffect(() => {
    if (!ready || !storageLoaded.current || !storageKey) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(data))
      .catch(() => showToast('Could not save on this device. Changes may be lost after reload.'));
  }, [data, ready, storageKey]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const buyPass = async (id: Pass['id']) => {
    const result = await demo.mutateAsync({ data: { plan: id } });
    auth.acceptSession(result);
  };

  const toggleSaved = useCallback((id: string) => {
    setData((d) => ({ ...d, saved: d.saved.includes(id) ? d.saved.filter((x) => x !== id) : [...d.saved, id] }));
  }, []);

  const setQuiz = useCallback((q: QuizAnswers | null) => {
    setData((d) => ({ ...d, quiz: q }));
    if (q) setCity(q.city);
  }, []);

  const pass: ActivePass | null = auth.pass ? { id: auth.pass.plan, expiresAt: Date.parse(auth.pass.expiresAt) } : null;
  const hasPass = !!auth.user && (auth.user.isAdmin || (!!pass && pass.expiresAt > Date.now()));

  const value: AppState = {
    ready, pass, hasPass, buyPass, saved: data.saved, toggleSaved, quiz: data.quiz, setQuiz,
    city, setCity, ideaCategory, setIdeaCategory, tipCategory, setTipCategory, toast, showToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
