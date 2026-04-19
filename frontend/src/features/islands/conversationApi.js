import { fetchJson, postJson } from '../../lib/api';

export const startConversationSession = ({ userId, islandId }) =>
  postJson('/api/conversation/session/start', {
    user_id: userId,
    island_id: islandId,
  });

export const submitConversationAttempt = ({ sessionId, promptId, userId, frames, debugOverrideWord }) =>
  postJson('/api/conversation/session/submit', {
    session_id: sessionId,
    prompt_id: promptId,
    user_id: userId ?? null,
    frames,
    ...(debugOverrideWord && { debug_override_word: debugOverrideWord }),
  });

export const listIslandPrompts = (islandId) =>
  fetchJson(`/api/conversation/islands/${islandId}/prompts`);

export const getConversationSession = (sessionId) =>
  fetchJson(`/api/conversation/session/${sessionId}`);

// Phase 3: multi-turn chain API
export const listIslandChains = (islandId) =>
  fetchJson(`/api/conversation/islands/${islandId}/chains`);

export const startChainSession = ({ userId, islandId, chainId }) =>
  postJson('/api/conversation/chain/start', {
    user_id: userId,
    island_id: islandId,
    chain_id: chainId,
  });

export const submitChainTurn = ({ chainSessionId, turnIndex, userId, frames, debugOverrideWord }) =>
  postJson('/api/conversation/chain/submit', {
    chain_session_id: chainSessionId,
    turn_index: turnIndex,
    user_id: userId ?? null,
    frames,
    ...(debugOverrideWord && { debug_override_word: debugOverrideWord }),
  });

export const getChainSession = (chainSessionId) =>
  fetchJson(`/api/conversation/chain/${chainSessionId}`);
