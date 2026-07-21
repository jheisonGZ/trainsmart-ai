export interface Achievement {
  id: string;
  user_id: string;
  achievement_key: string;
  unlocked_at: string;
}

export interface AchievementDefinition {
  key: string;
  icon: string;
  name: string;
  description: string;
  isUnlocked: (stats: import('./user-statistics.types').UserStatistics, personalRecordCount: number) => boolean;
}
