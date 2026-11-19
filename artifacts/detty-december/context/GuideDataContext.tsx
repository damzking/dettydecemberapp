import React, { createContext, useContext } from 'react';
import { useListIdeas, useListTips, useListPriceItems, type Idea, type Tip, type PriceItem } from '@workspace/api-client-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

interface GuideData {
  ideas: Idea[];
  tips: Tip[];
  prices: PriceItem[];
  loading: boolean;
  failed: boolean;
  retry: () => void;
}
const GuideContext = createContext<GuideData | null>(null);

// Query caches are scoped to the signed-in account, never to a device-only pass.
export function GuideDataProvider({ children }: { children: React.ReactNode }) {
  const { ready, hasPass } = useApp();
  const { user, refresh } = useAuth();
  const query = { enabled: ready && hasPass, staleTime: 30_000, retry: 1 };
  const ideas = useListIdeas({ query: { ...query, queryKey: ['/api/guide/ideas', user?.id] } });
  const tips = useListTips({ query: { ...query, queryKey: ['/api/guide/tips', user?.id] } });
  const prices = useListPriceItems({ query: { ...query, queryKey: ['/api/guide/prices', user?.id] } });
  const queries = [ideas, tips, prices];
  return (
    <GuideContext.Provider value={{
      ideas: ideas.data ?? [], tips: tips.data ?? [], prices: prices.data ?? [],
      loading: queries.some((q) => q.data === undefined && !q.isError),
      failed: queries.some((q) => q.data === undefined && q.isError),
      retry: () => { refresh(); void ideas.refetch(); void tips.refetch(); void prices.refetch(); },
    }}>
      {children}
    </GuideContext.Provider>
  );
}

export function useGuideData() {
  const value = useContext(GuideContext);
  if (!value) throw new Error('useGuideData requires GuideDataProvider');
  return value;
}
