import type { ContextSnapshot } from '../types/routine.types';
import { ROUTINE_OUTPUT_JSON_SHAPE } from './output-schema';

export interface RoutinePromptInput {
  contextSnapshot: ContextSnapshot;
  customInstructions?: string;
  reason?: string;
}

export function buildRoutineUserPrompt({
  contextSnapshot,
  customInstructions,
  reason,
}: RoutinePromptInput) {
  const {
    profile,
    health,
    latest_metrics: latestMetrics,
    environment_analysis: environmentAnalysis,
    feedback_summary: feedbackSummary,
  } = contextSnapshot;

  const sections: string[] = [];

  sections.push('PERFIL_USUARIO');
  sections.push(JSON.stringify(profile, null, 2));

  sections.push('HISTORIAL_DE_SALUD');
  sections.push(JSON.stringify(health, null, 2));

  sections.push('ULTIMAS_MEDICIONES');
  sections.push(JSON.stringify(latestMetrics, null, 2));

  sections.push('ENTORNO_Y_EQUIPO_DISPONIBLE');
  sections.push(
    environmentAnalysis
      ? JSON.stringify(
          {
            summary: environmentAnalysis.summary,
            space_description: environmentAnalysis.space_description,
            equipment_description: environmentAnalysis.equipment_description,
            training_context: environmentAnalysis.training_context,
          },
          null,
          2,
        )
      : [
          'No hay un reconocimiento visual guardado.',
          'Diseña la rutina para que pueda hacerse sin maquinas, con peso corporal, apoyos basicos y variantes simples.',
          'No asumas equipamiento confirmado.',
        ].join(' '),
  );

  sections.push('RETROALIMENTACION_RECIENTE');
  sections.push(JSON.stringify(feedbackSummary, null, 2));

  if (reason) {
    sections.push('MOTIVO_DE_GENERACION');
    sections.push(reason);
  }

  if (customInstructions) {
    sections.push('INSTRUCCIONES_PERSONALIZADAS');
    sections.push(customInstructions);
  }

  sections.push('SOLICITUD');
  sections.push(
    [
      `Genera un plan semanal de entrenamiento de ${profile.days_per_week ?? 3} dias.`,
      `Cada sesion debe caber dentro de ${profile.time_per_session ?? 45} minutos.`,
      'Evita consejos medicos y selecciones de ejercicios inseguras.',
      'Usa espanol neutro en todo el contenido textual.',
      'Prefiere nombres de ejercicios comunes en espanol y faciles de entender para principiantes.',
      'Si existe contexto visual de entorno o equipamiento, adaptate a la descripcion del espacio y al equipo visible confirmado; no asumas maquinas ni accesorios no visibles.',
      'Si no hay reconocimiento visual guardado, prioriza ejercicios sin maquinas, peso corporal y apoyos basicos.',
      'Si el espacio descrito es limitado, prioriza ejercicios compactos y variantes de peso corporal o implementos sencillos.',
      'Si hay riesgos relevantes, incluyelos en safety_warnings.',
      'No dejes campos requeridos vacios.',
      'Cada dia debe incluir calentamiento, vuelta a la calma y al menos un ejercicio.',
      'Si una instruccion textual no esta clara, escribe una indicacion breve y segura en espanol en vez de dejarla vacia.',
      'Devuelve solo JSON parseable que coincida exactamente con el schema requerido.',
    ].join(' '),
  );

  sections.push('SCHEMA_ESTRICTO_DE_SALIDA');
  sections.push(ROUTINE_OUTPUT_JSON_SHAPE);

  return sections.join('\n\n');
}
