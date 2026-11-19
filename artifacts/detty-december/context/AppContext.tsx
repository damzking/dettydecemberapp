// Shared app state: pass, saved ideas, quiz answers, filters and toast.
// Saved to the device with AsyncStorage so it survives a reload.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { PASSES, Pass } from '@/data/passes';
import { Category, City } from '@/data/ideas';
import { TipCategory } from '@/data/tips';

export interface QuizAnswers { city: City; length: string; vibes: Category[]; budget: string }
interface ActivePass { id: Pass['id']; expiresAt: number }

interface Stored { pass: ActivePass | null; saved: string[]; quiz: QuizAnswers | null }

interface AppState {
  ready: boolean;
  pass: ActivePass | null;
  hasPass: boolean;
  buyPass: (id: Pass['id']) => void;
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

const STORAGE_KEY = 'detty-december-v1';
const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Stored>({ pass: null, saved: [], quiz: null });
  const [city, setCity] = useState<City>('Lagos');
  const [ideaCategory, setIdeaCategory] = useState<Category | 'All'>('All');
  const [tipCategory, setTipCategory] = useState<TipCategory>('All');
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageLoaded = useRef(false);

  // Keep unread storage intact if loading fails, and tell the user.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) { storageLoaded.current = true; return; }
        const parsed = JSON.parse(raw) as Stored;
        if (!Array.isArray(parsed.saved) || !parsed.saved.every((id) => typeof id === 'string')) {
          throw new Error('Invalid saved ideas');
        }
        setData({ pass: parsed.pass ?? null, saved: parsed.saved ?? [], quiz: parsed.quiz ?? null });
        if (parsed.quiz?.city) setCity(parsed.quiz.city);
        storageLoaded.current = true;
      })
      .catch(() => showToast('Saved data could not be loaded. This session will not overwrite it.'))
      .finally(() => setReady(true));
  }, []);

  // Save whenever data changes (after first load).
  useEffect(() => {
    if (!ready || !storageLoaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      .catch(() => showToast('Could not save on this device. Changes may be lost after reload.'));
  }, [data, ready]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const buyPass = useCallback((id: Pass['id']) => {
    const p = PASSES.find((x) => x.id === id)!;
    setData((d) => ({ ...d, pass: { id, expiresAt: Date.now() + p.days * 86400000 } }));
  }, []);

  const toggleSaved = useCallback((id: string) => {
    setData((d) => ({ ...d, saved: d.saved.includes(id) ? d.saved.filter((x) => x !== id) : [...d.saved, id] }));
  }, []);

  const setQuiz = useCallback((q: QuizAnswers | null) => {
    setData((d) => ({ ...d, quiz: q }));
    if (q) setCity(q.city);
  }, []);

  const hasPass = !!data.pass && data.pass.expiresAt > Date.now();

  const value = useMemo<AppState>(() => ({
    ready, pass: data.pass, hasPass, buyPass, saved: data.saved, toggleSaved, quiz: data.quiz, setQuiz,
    city, setCity, ideaCategory, setIdeaCategory, tipCategory, setTipCategory, toast, showToast,
  }), [ready, data, hasPass, buyPass, toggleSaved, setQuiz, city, ideaCategory, tipCategory, toast, showToast]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
