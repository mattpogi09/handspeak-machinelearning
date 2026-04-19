import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { fetchJson } from '../lib/api';
import { ISLANDS_STORAGE_KEY, setIslandsCache } from '../features/study/studyVoyage';

const IslandsContext = createContext({
  islands: [],
  islandsLoading: true,
  error: null,
  getIslandById: () => undefined,
});

const normalizeLevel = (lvl) => ({
  ...lvl,
  phraseId: lvl.phrase_id,
  rewardXp: lvl.reward_xp,
});

const normalizeIsland = (raw) => ({
  ...raw,
  hasLearn: raw.has_learn,
  hasDrill: raw.has_drill,
  hasConverse: raw.has_converse,
  difficultyRank: raw.difficulty_rank,
  bossLevel: raw.boss_level
    ? { ...raw.boss_level, rewardXp: raw.boss_level.reward_xp }
    : null,
  levels: (raw.levels || []).map(normalizeLevel),
});

const loadCached = () => {
  try {
    const s = localStorage.getItem(ISLANDS_STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
};

export function IslandsProvider({ children }) {
  const [islands, setIslands] = useState(loadCached);
  const [islandsLoading, setIslandsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setError(null);
    fetchJson('/api/study/islands')
      .then((raw) => {
        if (!active) return;
        const normalized = Array.isArray(raw) ? raw.map(normalizeIsland) : [];
        setIslandsCache(normalized);
        setIslands(normalized);
      })
      .catch((e) => {
        if (!active) return;
        setError(e.message || 'Failed to load mapped learning islands');
        toast.error('Unable to load map data. Please check connection.');
      })
      .finally(() => { if (active) setIslandsLoading(false); });
    return () => { active = false; };
  }, []);

  const getIslandById = (id) => islands.find((i) => i.id === id);

  return (
    <IslandsContext.Provider value={{ islands, islandsLoading, error, getIslandById }}>
      {children}
    </IslandsContext.Provider>
  );
}

export const useIslands = () => useContext(IslandsContext);
