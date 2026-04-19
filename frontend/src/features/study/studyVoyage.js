import { fetchJson, postJson } from '../../lib/api';

export const STUDY_PROGRESS_STORAGE_KEY = 'handspeak_study_progress';
export const ISLANDS_STORAGE_KEY = 'handspeak_islands_cache';

const USER_STORAGE_KEY = 'handspeak_user';
const XP_PER_LEVEL = 10;
const PLAYER_LEVEL_XP_STEP = 50;

const _loadCachedIslands = () => {
  try {
    const stored = localStorage.getItem(ISLANDS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export let STUDY_ISLANDS = _loadCachedIslands();

export const setIslandsCache = (islands) => {
  STUDY_ISLANDS = islands;
  try {
    localStorage.setItem(ISLANDS_STORAGE_KEY, JSON.stringify(islands));
  } catch {}
};

const makeEmptyIslandProgress = () => ({
  completedLevelIds: [],
  introSeen: false,
  stars: 0,
});

const buildBaseProgress = () => {
  const islands = {};
  STUDY_ISLANDS.forEach((island) => {
    islands[island.id] = makeEmptyIslandProgress();
  });
  return {
    version: 2,
    islands,
    unlockedIslandIds: STUDY_ISLANDS.length > 0 ? [STUDY_ISLANDS[0].id] : [],
    totalXp: 0,
    updatedAt: new Date().toISOString(),
  };
};

const unique = (arr) => Array.from(new Set(Array.isArray(arr) ? arr : []));

const syncLegacyFields = (progress) => {
  const completedTopics = STUDY_ISLANDS
    .filter((island) => isIslandCompleted(progress, island.id))
    .map((island) => island.id);

  const completedPhraseIds = unique(
    STUDY_ISLANDS.flatMap((island) => {
      const done = progress.islands[island.id]?.completedLevelIds || [];
      return island.levels
        .filter((level) => done.includes(level.id))
        .map((level) => level.phraseId);
    })
  );

  return {
    ...progress,
    completed_topics: completedTopics,
    completed_phrases: completedPhraseIds,
    xp: progress.totalXp,
    level: 1 + Math.floor(progress.totalXp / PLAYER_LEVEL_XP_STEP),
  };
};

const computeStars = (island, islandProgress) => {
  const phraseStars = island.levels.filter((level) =>
    islandProgress.completedLevelIds.includes(level.id)
  ).length;
  return phraseStars;
};

const recomputeUnlockedIslands = (progress) => {
  const unlocked = [];
  STUDY_ISLANDS.forEach((island, index) => {
    if (index === 0) { unlocked.push(island.id); return; }
    const prevIsland = STUDY_ISLANDS[index - 1];
    if (isIslandCompleted(progress, prevIsland.id)) unlocked.push(island.id);
  });
  return unlocked;
};

const computeXpFromProgress = (progress) =>
  STUDY_ISLANDS.reduce((acc, island) => {
    const islandProgress = progress.islands[island.id] || makeEmptyIslandProgress();
    const levelXp = island.levels
      .filter((level) => islandProgress.completedLevelIds.includes(level.id))
      .reduce((sum, level) => sum + (level.rewardXp || XP_PER_LEVEL), 0);
    return acc + levelXp;
  }, 0);

const normalizeV2Progress = (raw) => {
  const base = buildBaseProgress();
  const merged = { ...base, ...raw, islands: { ...base.islands } };

  STUDY_ISLANDS.forEach((island) => {
    const rawIsland = raw?.islands?.[island.id] || {};
    const completedLevelIds = unique(rawIsland.completedLevelIds).filter((levelId) =>
      island.levels.some((level) => level.id === levelId)
    );
    const islandProgress = {
      ...makeEmptyIslandProgress(),
      ...rawIsland,
      completedLevelIds,
      introSeen: Boolean(rawIsland.introSeen),
    };
    islandProgress.stars = computeStars(island, islandProgress);
    merged.islands[island.id] = islandProgress;
  });

  merged.unlockedIslandIds = recomputeUnlockedIslands(merged);
  merged.totalXp = Number.isFinite(raw?.totalXp) ? raw.totalXp : computeXpFromProgress(merged);
  merged.updatedAt = raw?.updatedAt || new Date().toISOString();
  return syncLegacyFields(merged);
};

const migrateLegacyProgress = (raw) => {
  const migrated = buildBaseProgress();
  const completedTopics = unique(raw?.completed_topics);
  const completedPhrases = unique(raw?.completed_phrases);

  STUDY_ISLANDS.forEach((island) => {
    const doneLevels = island.levels
      .filter((level) =>
        completedPhrases.includes(level.phraseId) || completedPhrases.includes(level.id)
      )
      .map((level) => level.id);

    const islandProgress = {
      ...makeEmptyIslandProgress(),
      completedLevelIds: doneLevels,
      introSeen: doneLevels.length > 0 || completedTopics.includes(island.id),
    };
    islandProgress.stars = computeStars(island, islandProgress);
    migrated.islands[island.id] = islandProgress;
  });

  migrated.unlockedIslandIds = recomputeUnlockedIslands(migrated);
  migrated.totalXp = Number.isFinite(raw?.xp) ? raw.xp : computeXpFromProgress(migrated);
  migrated.updatedAt = new Date().toISOString();
  return syncLegacyFields(migrated);
};

export const getInitialStudyProgress = () => syncLegacyFields(buildBaseProgress());

export const normalizeStudyProgress = (raw) => {
  if (!raw || typeof raw !== 'object') return getInitialStudyProgress();
  if (raw.version === 2 && raw.islands) return normalizeV2Progress(raw);
  return migrateLegacyProgress(raw);
};

export const getStoredStudyProgress = () => {
  const stored = localStorage.getItem(STUDY_PROGRESS_STORAGE_KEY);
  if (!stored) return getInitialStudyProgress();
  try {
    return normalizeStudyProgress(JSON.parse(stored));
  } catch {
    return getInitialStudyProgress();
  }
};

export const saveStudyProgress = (progress) => {
  localStorage.setItem(STUDY_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  try {
    const user = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || 'null');
    if (user?.id) {
      void postJson(`/api/study/progress/${user.id}`, { progress }).catch(() => {});
    }
  } catch {
    // Local cache is still updated above.
  }
};

export const loadStudyProgress = async () => {
  try {
    const user = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || 'null');
    if (!user?.id) return getStoredStudyProgress();
    const progress = await fetchJson(`/api/study/progress/${user.id}`);
    const normalized = normalizeStudyProgress(progress);
    localStorage.setItem(STUDY_PROGRESS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return getStoredStudyProgress();
  }
};

export const resetStudyProgress = () => {
  const initial = getInitialStudyProgress();
  saveStudyProgress(initial);
  return initial;
};

export const getIslandById = (islandId) => STUDY_ISLANDS.find((island) => island.id === islandId);

export const getIslandProgress = (progress, islandId) =>
  progress?.islands?.[islandId] || makeEmptyIslandProgress();

export const isIslandUnlocked = (progress, islandId) =>
  (progress?.unlockedIslandIds || []).includes(islandId);

export const isIslandCompleted = (progress, islandId) => {
  const island = getIslandById(islandId);
  if (!island) return false;
  const islandProgress = getIslandProgress(progress, islandId);
  return island.levels.every((level) => islandProgress.completedLevelIds.includes(level.id));
};

export const isLevelCompleted = (progress, islandId, levelId) =>
  getIslandProgress(progress, islandId).completedLevelIds.includes(levelId);

export const getCurrentIslandId = (progress) => {
  const current = STUDY_ISLANDS.find(
    (island) => isIslandUnlocked(progress, island.id) && !isIslandCompleted(progress, island.id)
  );
  if (current) return current.id;
  const unlocked = progress?.unlockedIslandIds || [];
  return unlocked[unlocked.length - 1] || STUDY_ISLANDS[0]?.id;
};

export const setIslandIntroSeen = (progress, islandId) => {
  const island = getIslandById(islandId);
  if (!island) return progress;
  const next = {
    ...progress,
    islands: {
      ...progress.islands,
      [islandId]: { ...getIslandProgress(progress, islandId), introSeen: true },
    },
    updatedAt: new Date().toISOString(),
  };
  return syncLegacyFields(next);
};

export const completeIslandLevel = (progress, islandId, levelId) => {
  const island = getIslandById(islandId);
  if (!island) return progress;

  const currentIslandProgress = getIslandProgress(progress, islandId);
  const phraseLevel = island.levels.find((level) => level.id === levelId);

  if (!phraseLevel) return progress;

  let totalXp = progress.totalXp;
  let updatedIslandProgress = { ...currentIslandProgress };

  if (!updatedIslandProgress.completedLevelIds.includes(levelId)) {
    updatedIslandProgress.completedLevelIds = [...updatedIslandProgress.completedLevelIds, levelId];
    totalXp += phraseLevel.rewardXp || XP_PER_LEVEL;
  }

  updatedIslandProgress.stars = computeStars(island, updatedIslandProgress);

  const next = {
    ...progress,
    islands: { ...progress.islands, [islandId]: updatedIslandProgress },
    totalXp,
    updatedAt: new Date().toISOString(),
  };

  next.unlockedIslandIds = recomputeUnlockedIslands(next);
  return syncLegacyFields(next);
};

export const getVoyageStats = (progress) => {
  const completedIslands = STUDY_ISLANDS.filter((island) =>
    isIslandCompleted(progress, island.id)
  ).length;
  const totalPhraseLevels = STUDY_ISLANDS.reduce((acc, island) => acc + island.levels.length, 0);
  const completedPhraseLevels = STUDY_ISLANDS.reduce((acc, island) => {
    const islandProgress = getIslandProgress(progress, island.id);
    return acc + islandProgress.completedLevelIds.length;
  }, 0);

  return {
    completedIslands,
    totalIslands: STUDY_ISLANDS.length,
    completedPhraseLevels,
    totalPhraseLevels,
    progressPercent: Math.round((completedIslands / Math.max(STUDY_ISLANDS.length, 1)) * 100),
    playerLevel: progress.level || 1,
    xp: progress.totalXp || 0,
  };
};

