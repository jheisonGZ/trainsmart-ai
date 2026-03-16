import { ROUTINE_PROMPT_VERSION, ROUTINE_SYSTEM_PROMPT } from './routine-system.prompt';
import { buildRoutineUserPrompt } from './routine-user.prompt';
import type { ContextSnapshot } from '../types/routine.types';

export interface BuildRoutinePromptOptions {
  contextSnapshot: ContextSnapshot;
  customInstructions?: string;
  reason?: string;
}

export function buildRoutinePrompt(options: BuildRoutinePromptOptions) {
  return {
    systemPrompt: ROUTINE_SYSTEM_PROMPT,
    userPrompt: buildRoutineUserPrompt(options),
    promptVersion: ROUTINE_PROMPT_VERSION,
  };
}
