import { STUDY_TOPICS, ALPHABET_TOPICS } from '../../data/aslData';

export const STUDY_PROGRESS_STORAGE_KEY = 'handspeak_study_progress';

const XP_PER_LEVEL = 10;
const XP_PER_BOSS = 40;
const PLAYER_LEVEL_XP_STEP = 50;

const ISLAND_DIFFICULTY = {
  greetings: 'Easy',
  family: 'Easy',
  colors: 'Medium',
  food: 'Medium',
  animals: 'Hard',
};

const ISLAND_THEME = {
  greetings: {
    sky: 'linear-gradient(180deg, #8fd3ff 0%, #4fb4ff 100%)',
    island: 'linear-gradient(180deg, #ffd36f 0%, #ffb347 100%)',
  },
  family: {
    sky: 'linear-gradient(180deg, #c9f7d9 0%, #74d6ae 100%)',
    island: 'linear-gradient(180deg, #c8b6a6 0%, #9c7f66 100%)',
  },
  colors: {
    sky: 'linear-gradient(180deg, #ceb9ff 0%, #8f74ff 100%)',
    island: 'linear-gradient(180deg, #8aa7ff 0%, #5867df 100%)',
  },
  food: {
    sky: 'linear-gradient(180deg, #ffe6b8 0%, #ffb16d 100%)',
    island: 'linear-gradient(180deg, #ff8a65 0%, #e96d4e 100%)',
  },
  animals: {
    sky: 'linear-gradient(180deg, #9be7df 0%, #3bb8a8 100%)',
    island: 'linear-gradient(180deg, #5f8f8a 0%, #3a6661 100%)',
  },
};

const difficultyRank = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
};

const makeLevelId = (islandId, phraseId) => `${islandId}::${phraseId}`;
const makeBossLevelId = (islandId) => `${islandId}::boss`;

const ISLAND_INTRO = {
  greetings: {
    title: 'Greetings Island',
    story: 'Every great voyage begins with a wave! On Greetings Island you will learn foundational conversational words that open doors and start conversations.',
    description: 'Master your first set of essential ASL words and build confidence before moving deeper into the voyage.',
    objective: 'Complete all word levels to unlock the Greetings Boss Challenge.',
    hint: 'Keep your hand clearly centered in frame and use smooth, deliberate movements.',
  },
  family: {
    title: 'Family Island',
    story: 'Deep in the emerald coves of Family Island, you will discover words used to describe people and close relationships in daily life.',
    description: 'Learn a full set of relationship-focused words and sharpen your face-area hand placement.',
    objective: 'Clear all family island word levels and take on the Family Boss Challenge.',
    hint: 'Most family signs are near your chin (female) or forehead (male) — position matters!',
  },
  colors: {
    title: 'Colors Island',
    story: 'Colors Island is a kaleidoscope of expressive movement. This chapter focuses on clear wrist and handshape control for descriptive words.',
    description: 'Explore a larger set of descriptive words where precision and rhythm make a visible difference.',
    objective: 'Learn all color island word levels and face the Colors Boss Challenge.',
    hint: 'Colors like Blue (B-hand) and Green (G-hand) involve a gentle wrist twist — practice the motion slowly.',
  },
  food: {
    title: 'Food Island',
    story: 'The rich aromas of Food Island drift across the sea! This island builds practical daily vocabulary around actions and common objects.',
    description: 'Discover a complete batch of useful food and daily-life words that are highly visual and memorable.',
    objective: 'Complete all food island word levels to unlock the Food Boss Challenge.',
    hint: 'Food signs often involve bringing your hand toward your mouth — keep the motion natural and fluid.',
  },
  animals: {
    title: 'Animals Island',
    story: 'Welcome to the wild shores of Animals Island! This final chapter emphasizes expressive signing and stronger gesture clarity.',
    description: 'Learn an advanced set of expressive words and finish your 100-word study voyage with confidence.',
    objective: 'Master all animal island word levels and challenge the Animals Island Boss.',
    hint: 'Use your whole hand and face for animal signs — expression makes the sign come alive!',
  },
};

// Intro for alphabet chapters
const getAlphabetIntro = (chapterNum) => ({
  title: `Alphabet Chapter ${chapterNum}`,
  story: `Start your journey by mastering the foundational alphabet letters! Chapter ${chapterNum} covers essential hand positions and shapes.`,
  description: `Learn and practice the ASL letters in this chapter. Each letter builds the foundation for fluent signing.`,
  objective: `Complete all letter levels in this chapter.`,
  hint: 'Hold each letter steady for 1-2 seconds. Clear finger and hand positioning is key!',
});

// Build alphabet intro map
const ALPHABET_INTRO = {};
for (let i = 1; i <= ALPHABET_TOPICS.length; i++) {
  ALPHABET_INTRO[`alphabet-chapter-${i}`] = getAlphabetIntro(i);
}


export const STUDY_ISLANDS = [
  // Alphabet chapters first
  ...ALPHABET_TOPICS.map((topic, index) => {
    const difficulty = 'Easy';
    const intro = ALPHABET_INTRO[topic.id] || getAlphabetIntro(index + 1);
    
    return {
      id: topic.id,
      title: topic.title,
      order: index + 1,
      icon: topic.icon,
      type: 'alphabet',
      difficulty,
      difficultyRank: difficultyRank[difficulty] || 1,
      intro,
      theme: {
        sky: 'linear-gradient(180deg, #e0c3fc 0%, #8ec5fc 100%)',
        island: 'linear-gradient(180deg, #ffd89b 0%, #19547b 100%)',
      },
      levels: topic.phrases.map((phrase, phraseIndex) => ({
        id: makeLevelId(topic.id, phrase.id),
        phraseId: phrase.id,
        order: phraseIndex + 1,
        type: 'letter',
        label: phrase.label,
        description: phrase.description,
        tip: phrase.tip,
        rewardXp: Math.floor(XP_PER_LEVEL * 0.5), // Less XP for letters
      })),
      // No boss level for alphabet
      bossLevel: null,
    };
  }),
  // Then vocabulary islands
  ...STUDY_TOPICS.map((topic, index) => {
    const difficulty = ISLAND_DIFFICULTY[topic.id] || 'Medium';
    const intro = ISLAND_INTRO[topic.id] || {
      title: `${topic.title} Island`,
      story: `Learn and master essential ${topic.title.toLowerCase()} signs on this exciting island.`,
      description: `Learn and master essential ${topic.title.toLowerCase()} signs before challenging the island boss.`,
      objective: 'Clear all word levels to unlock the boss challenge.',
      hint: 'Use clear hand movement and keep your hand centered in frame.',
    };

    return {
      id: topic.id,
      title: topic.title,
      order: ALPHABET_TOPICS.length + index + 1,
      icon: topic.icon,
      type: 'vocabulary',
      difficulty,
      difficultyRank: difficultyRank[difficulty] || 2,
      intro,
      theme: ISLAND_THEME[topic.id] || {
        sky: 'linear-gradient(180deg, #95c7ff 0%, #3f86d9 100%)',
        island: 'linear-gradient(180deg, #ffcb80 0%, #f59f4b 100%)',
      },
      levels: topic.phrases.map((phrase, phraseIndex) => ({
        id: makeLevelId(topic.id, phrase.id),
        phraseId: phrase.id,
        order: phraseIndex + 1,
        type: 'word',
        label: phrase.label,
        description: phrase.description,
        tip: phrase.tip,
        rewardXp: XP_PER_LEVEL,
      })),
      bossLevel: {
        id: makeBossLevelId(topic.id),
        type: 'boss',
        order: topic.phrases.length + 1,
        label: `${topic.title} Boss`,
        description: 'Perform sentence-like combinations using signs learned in this island.',
        rewardXp: XP_PER_BOSS,
      },
    };
  }),
];

const makeEmptyIslandProgress = () => ({
  completedLevelIds: [],
  bossCompleted: false,
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
  const phraseStars = island.levels.filter((level) => islandProgress.completedLevelIds.includes(level.id)).length;
  return phraseStars + (islandProgress.bossCompleted ? 1 : 0);
};

const recomputeUnlockedIslands = (progress) => {
  const unlocked = [];

  STUDY_ISLANDS.forEach((island, index) => {
    if (index === 0) {
      unlocked.push(island.id);
      return;
    }

    const prevIsland = STUDY_ISLANDS[index - 1];
    if (isIslandCompleted(progress, prevIsland.id)) {
      unlocked.push(island.id);
    }
  });

  return unlocked;
};

const computeXpFromProgress = (progress) => {
  return STUDY_ISLANDS.reduce((acc, island) => {
    const islandProgress = progress.islands[island.id] || makeEmptyIslandProgress();
    const levelXp = island.levels
      .filter((level) => islandProgress.completedLevelIds.includes(level.id))
      .reduce((sum, level) => sum + (level.rewardXp || XP_PER_LEVEL), 0);
    const bossXp = islandProgress.bossCompleted ? (island.bossLevel?.rewardXp || XP_PER_BOSS) : 0;
    return acc + levelXp + bossXp;
  }, 0);
};

const normalizeV2Progress = (raw) => {
  const base = buildBaseProgress();

  const merged = {
    ...base,
    ...raw,
    islands: { ...base.islands },
  };

  STUDY_ISLANDS.forEach((island) => {
    const rawIsland = raw?.islands?.[island.id] || {};
    const completedLevelIds = unique(rawIsland.completedLevelIds).filter((levelId) =>
      island.levels.some((level) => level.id === levelId)
    );

    const islandProgress = {
      ...makeEmptyIslandProgress(),
      ...rawIsland,
      completedLevelIds,
      bossCompleted: Boolean(rawIsland.bossCompleted),
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
      .filter((level) => completedPhrases.includes(level.phraseId) || completedPhrases.includes(level.id))
      .map((level) => level.id);

    const islandProgress = {
      ...makeEmptyIslandProgress(),
      completedLevelIds: doneLevels,
      bossCompleted: completedTopics.includes(island.id),
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
  } catch (error) {
    return getInitialStudyProgress();
  }
};

export const saveStudyProgress = (progress) => {
  localStorage.setItem(STUDY_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
};

export const getIslandById = (islandId) => STUDY_ISLANDS.find((island) => island.id === islandId);

export const getIslandProgress = (progress, islandId) => progress?.islands?.[islandId] || makeEmptyIslandProgress();

export const isIslandUnlocked = (progress, islandId) =>
  (progress?.unlockedIslandIds || []).includes(islandId);

export const isIslandCompleted = (progress, islandId) =>
  (() => {
    const island = getIslandById(islandId);
    if (!island) return false;

    const islandProgress = getIslandProgress(progress, islandId);
    if (island.bossLevel) {
      return Boolean(islandProgress.bossCompleted);
    }

    return island.levels.every((level) => islandProgress.completedLevelIds.includes(level.id));
  })();

export const isLevelCompleted = (progress, islandId, levelId) => {
  const islandProgress = getIslandProgress(progress, islandId);
  return islandProgress.completedLevelIds.includes(levelId);
};

export const isBossUnlocked = (progress, islandId) => {
  const island = getIslandById(islandId);
  if (!island) return false;
  if (!island.bossLevel) return false;

  const islandProgress = getIslandProgress(progress, islandId);
  return island.levels.every((level) => islandProgress.completedLevelIds.includes(level.id));
};

export const getCurrentIslandId = (progress) => {
  const current = STUDY_ISLANDS.find((island) =>
    isIslandUnlocked(progress, island.id) && !isIslandCompleted(progress, island.id)
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
      [islandId]: {
        ...getIslandProgress(progress, islandId),
        introSeen: true,
      },
    },
    updatedAt: new Date().toISOString(),
  };

  return syncLegacyFields(next);
};

export const completeIslandLevel = (progress, islandId, levelId) => {
  const island = getIslandById(islandId);
  if (!island) return progress;

  const currentIslandProgress = getIslandProgress(progress, islandId);
  const isBoss = Boolean(island.bossLevel && levelId === island.bossLevel.id);
  const phraseLevel = island.levels.find((level) => level.id === levelId);

  if (!isBoss && !phraseLevel) return progress;

  let totalXp = progress.totalXp;
  let updatedIslandProgress = { ...currentIslandProgress };

  if (isBoss) {
    if (updatedIslandProgress.bossCompleted || !isBossUnlocked(progress, islandId)) {
      return progress;
    }
    updatedIslandProgress.bossCompleted = true;
    totalXp += island.bossLevel?.rewardXp || XP_PER_BOSS;
  } else if (!updatedIslandProgress.completedLevelIds.includes(levelId)) {
    updatedIslandProgress.completedLevelIds = [...updatedIslandProgress.completedLevelIds, levelId];
    totalXp += phraseLevel.rewardXp || XP_PER_LEVEL;

    // Islands without a boss are considered complete when all phrase levels are done.
    if (!island.bossLevel) {
      const allDone = island.levels.every((level) => updatedIslandProgress.completedLevelIds.includes(level.id));
      if (allDone) {
        updatedIslandProgress.bossCompleted = true;
      }
    }
  }

  updatedIslandProgress.stars = computeStars(island, updatedIslandProgress);

  const next = {
    ...progress,
    islands: {
      ...progress.islands,
      [islandId]: updatedIslandProgress,
    },
    totalXp,
    updatedAt: new Date().toISOString(),
  };

  next.unlockedIslandIds = recomputeUnlockedIslands(next);
  return syncLegacyFields(next);
};

export const getVoyageStats = (progress) => {
  const completedIslands = STUDY_ISLANDS.filter((island) => isIslandCompleted(progress, island.id)).length;
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

export const buildBossChallenge = (island, progress) => {
  const islandProgress = getIslandProgress(progress, island.id);
  const completedLabels = island.levels
    .filter((level) => islandProgress.completedLevelIds.includes(level.id))
    .map((level) => level.label);

  const pool = completedLabels.length > 0 ? completedLabels : island.levels.map((level) => level.label);
  if (pool.length === 0) {
    return {
      title: `${island.title} Sentence Boss`,
      objective: 'Combine learned signs into sentence-like patterns.',
      combinations: ['Practice 2 to 3 signs in sequence.'],
    };
  }

  const combinations = [];

  for (let i = 0; i < Math.min(3, pool.length + 1); i += 1) {
    const first = pool[i % pool.length];
    const second = pool[(i + 1) % pool.length];
    const third = pool[(i + 2) % pool.length];

    if (pool.length >= 3 && i === 2) {
      combinations.push(`${first} + ${second} + ${third}`);
    } else {
      combinations.push(`${first} + ${second}`);
    }
  }

  return {
    title: `${island.title} Sentence Boss`,
    objective: 'Sign each combination smoothly in order, like one complete sentence.',
    combinations: unique(combinations),
  };
};
