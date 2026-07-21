import type { AchievementDefinition } from '../types/achievement.types';

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    key: 'first_workout',
    icon: '🎉',
    name: 'Primer entrenamiento',
    description: 'Completaste tu primera sesión de entrenamiento.',
    isUnlocked: (stats) => stats.total_sessions >= 1,
  },
  {
    key: 'sessions_10',
    icon: '💪',
    name: '10 entrenamientos',
    description: 'Completaste 10 sesiones de entrenamiento.',
    isUnlocked: (stats) => stats.total_sessions >= 10,
  },
  {
    key: 'sessions_50',
    icon: '🔥',
    name: '50 entrenamientos',
    description: 'Completaste 50 sesiones de entrenamiento.',
    isUnlocked: (stats) => stats.total_sessions >= 50,
  },
  {
    key: 'sessions_100',
    icon: '🏆',
    name: '100 entrenamientos',
    description: 'Completaste 100 sesiones de entrenamiento.',
    isUnlocked: (stats) => stats.total_sessions >= 100,
  },
  {
    key: 'streak_7_days',
    icon: '⚡',
    name: '7 días seguidos',
    description: 'Entrenaste 7 días seguidos.',
    isUnlocked: (stats) => stats.longest_streak_days >= 7,
  },
  {
    key: 'streak_30_days',
    icon: '🌟',
    name: '30 días seguidos',
    description: 'Entrenaste 30 días seguidos.',
    isUnlocked: (stats) => stats.longest_streak_days >= 30,
  },
  {
    key: 'volume_1000kg',
    icon: '🏋️',
    name: '1000 kg levantados',
    description: 'Acumulaste 1000 kg de volumen total levantado.',
    isUnlocked: (stats) => stats.total_volume_kg >= 1000,
  },
  {
    key: 'first_record',
    icon: '📈',
    name: 'Primer récord',
    description: 'Superaste tu primer récord personal.',
    isUnlocked: (_stats, personalRecordCount) => personalRecordCount >= 1,
  },
];
