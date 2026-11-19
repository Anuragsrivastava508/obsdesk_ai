import { CATEGORY_TEAM_MAP } from '../utils/constants.js';

/**
 * Rule-based ticket routing. Replace this module later with an AI provider
 * without changing callers. This is NOT machine learning.
 */
export const suggestTeam = (category) => {
  return CATEGORY_TEAM_MAP[category] || 'GENERAL_OPERATIONS';
};

export const isCriticalPriority = (priority) => priority === 'CRITICAL';
