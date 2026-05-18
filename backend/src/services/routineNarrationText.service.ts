import type { RoutineDay, RoutineVersion } from '../types/routine.types';
import type { WorkoutSessionExercise } from '../types/session.types';

interface BuildRoutineNarrationInput {
  version: RoutineVersion | null;
  day: RoutineDay | null;
  exercises: WorkoutSessionExercise[];
}

function clean(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function formatRest(seconds: number | null) {
  if (!seconds || seconds <= 0) {
    return '';
  }

  return ` con descansos de ${seconds} segundos`;
}

function trimToMaxLength(text: string, maxLength = 1800) {
  if (text.length <= maxLength) {
    return text;
  }

  const trimmed = text.slice(0, maxLength - 1);
  const lastSentence = Math.max(trimmed.lastIndexOf('.'), trimmed.lastIndexOf(';'));
  return `${trimmed.slice(0, lastSentence > 800 ? lastSentence + 1 : maxLength - 1).trim()}`;
}

export function buildRoutineNarrationText(input: BuildRoutineNarrationInput) {
  const dayLabel = clean(input.day?.day_label) || 'sesion de entrenamiento';
  const summary = clean(input.version?.llm_output.summary);
  const warmup = clean(input.day?.warmup_notes);
  const cooldown = clean(input.day?.cooldown_notes);
  const safetyWarnings = input.version?.llm_output.safety_warnings
    ?.map(clean)
    .filter(Boolean)
    .slice(0, 2) ?? [];

  const exerciseSentences = input.exercises.slice(0, 8).map((exercise) => {
    const sets = exercise.planned_sets ? `${exercise.planned_sets} series` : 'las series indicadas';
    const reps = clean(exercise.planned_reps);
    const repsText = reps ? ` de ${reps}` : '';
    return `${clean(exercise.exercise_name)}: ${sets}${repsText}${formatRest(exercise.rest_seconds)}`;
  });

  const parts = [
    `Rutina de hoy. El objetivo de esta sesion es ${dayLabel.toLowerCase()}.`,
    summary ? `Contexto de la rutina: ${summary}.` : null,
    warmup ? `Inicia con el calentamiento indicado: ${warmup}.` : null,
    exerciseSentences.length > 0
      ? `Luego realiza los ejercicios principales: ${exerciseSentences.join('; ')}.`
      : 'Luego realiza los ejercicios registrados para esta sesion, respetando el orden indicado.',
    safetyWarnings.length > 0
      ? `Advertencias importantes: ${safetyWarnings.join(' ')}`
      : null,
    cooldown ? `Cierra con esta indicacion: ${cooldown}.` : null,
    'Mantén una tecnica controlada, respeta los descansos y evita compensaciones.',
    'Si aparece dolor agudo o una molestia inusual, detén el ejercicio y registra la observacion al finalizar la sesion. No ignores señales de alarma.',
    'Finaliza con calma y guarda tu feedback para ajustar el seguimiento.',
  ].filter(Boolean);

  return trimToMaxLength(parts.join(' ').replace(/\s+/g, ' ').trim());
}
