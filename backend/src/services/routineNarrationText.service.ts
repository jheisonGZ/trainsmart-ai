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
    `Hola, soy tu guia de entrenamiento. La sesion de hoy es ${dayLabel.toLowerCase()}.`,
    summary ? `${summary}.` : null,
    warmup
      ? `Empecemos por el calentamiento: ${warmup}. Esto prepara tus articulaciones y musculos, y reduce el riesgo de lesion antes del trabajo fuerte.`
      : 'Empieza con unos minutos de movilidad y activacion antes del trabajo principal, asi llegas mejor preparado a los ejercicios de fuerza.',
    exerciseSentences.length > 0
      ? `Ahora vamos con los ejercicios principales, en este orden: ${exerciseSentences.join('; ')}. Respeta los descansos entre series, son parte del entrenamiento, no tiempo perdido.`
      : 'Ahora realiza los ejercicios registrados para esta sesion, respetando el orden indicado y los descansos entre series.',
    safetyWarnings.length > 0
      ? `Antes de seguir, ten en cuenta esto: ${safetyWarnings.join(' ')}`
      : null,
    cooldown
      ? `Para cerrar, no te saltes la vuelta a la calma: ${cooldown}. Ayuda a que tu cuerpo se recupere mas rapido para la proxima sesion.`
      : 'Para cerrar, dedica unos minutos a estirar los musculos trabajados, ayuda a que tu cuerpo se recupere mejor.',
    'Manten siempre una tecnica controlada: es preferible bajar el peso antes que perder la forma del ejercicio.',
    'Si sientes un dolor agudo o algo que no es normal en ti, detente de inmediato y registralo al terminar la sesion. Esa informacion ajusta tus proximas rutinas.',
    'Eso es todo por hoy. Buen entrenamiento.',
  ].filter(Boolean);

  return trimToMaxLength(parts.join(' ').replace(/\s+/g, ' ').trim());
}
