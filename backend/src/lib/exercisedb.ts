import { logger } from './logger';

const EXERCISEDB_BASE_URL = 'https://oss.exercisedb.dev/api/v1';
const REQUEST_TIMEOUT_MS = 8000;

const gifCache = new Map<string, string | null>();

/**
 * ExerciseDB's catalog is English-only. Routine exercise names come out of the
 * LLM in Spanish (by design, see routine-system.prompt.ts), so we translate
 * common resistance-training terms before querying. Ordered longest-phrase
 * first so multi-word terms match before their component words do.
 */
const ES_TO_EN_TERMS: Array<[string, string]> = [
  ['press de banca inclinado', 'incline bench press'],
  ['press de banca declinado', 'decline bench press'],
  ['press militar', 'shoulder press'],
  ['press de hombros', 'shoulder press'],
  ['press de banca', 'bench press'],
  ['press de pecho', 'chest press'],
  ['press inclinado', 'incline bench press'],
  ['press declinado', 'decline bench press'],
  ['press plano', 'flat bench press'],
  ['press arnold', 'arnold press'],
  ['press cerrado', 'close grip bench press'],
  ['press frances', 'skullcrusher'],
  ['sentadilla bulgara', 'bulgarian split squat'],
  ['sentadilla goblet', 'goblet squat'],
  ['sentadilla sumo', 'sumo squat'],
  ['sentadilla frontal', 'front squat'],
  ['sentadilla con barra', 'barbell squat'],
  ['sentadilla hack', 'hack squat'],
  ['sentadilla', 'squat'],
  ['hack squat', 'hack squat'],
  ['peso muerto rumano', 'romanian deadlift'],
  ['peso muerto sumo', 'sumo deadlift'],
  ['peso muerto rígido', 'stiff leg deadlift'],
  ['peso muerto piernas rigidas', 'stiff leg deadlift'],
  ['peso muerto con kettlebell', 'kettlebell deadlift'],
  ['peso muerto', 'deadlift'],
  ['zancadas caminando', 'walking lunge'],
  ['zancadas con mancuernas', 'dumbbell lunge'],
  ['zancadas', 'lunge'],
  ['estocadas', 'lunge'],
  ['zancada', 'lunge'],
  ['remo con mancuerna', 'dumbbell row'],
  ['remo con barra', 'barbell row'],
  ['remo sentado', 'seated row'],
  ['remo en polea', 'cable row'],
  ['remo invertido', 'inverted row'],
  ['remo con kettlebell', 'kettlebell row'],
  ['remo', 'row'],
  ['jalon al pecho', 'lat pulldown'],
  ['jalon tras nuca', 'behind the neck pulldown'],
  ['jalon', 'pulldown'],
  ['dominadas', 'pull up'],
  ['pull up', 'pull up'],
  ['chin up', 'chin up'],
  ['fondos en paralelas', 'dip'],
  ['fondos', 'dip'],
  ['curl de biceps', 'bicep curl'],
  ['curl biceps', 'bicep curl'],
  ['curl martillo', 'hammer curl'],
  ['curl concentrado', 'concentration curl'],
  ['curl en banco scott', 'preacher curl'],
  ['curl femoral', 'leg curl'],
  ['curl', 'curl'],
  ['extension de triceps', 'tricep extension'],
  ['patada de triceps', 'tricep kickback'],
  ['elevaciones laterales', 'lateral raise'],
  ['elevacion lateral', 'lateral raise'],
  ['elevaciones frontales', 'front raise'],
  ['elevacion frontal', 'front raise'],
  ['elevacion de piernas', 'leg raise'],
  ['elevacion de talones', 'calf raise'],
  ['elevacion de rodillas', 'hanging knee raise'],
  ['elevacion posterior', 'reverse fly'],
  ['pajaros', 'reverse fly'],
  ['aperturas con mancuernas', 'dumbbell fly'],
  ['aperturas en polea', 'cable fly'],
  ['aperturas', 'fly'],
  ['cruce de poleas', 'cable crossover'],
  ['plancha lateral', 'side plank'],
  ['plancha con giro', 'side plank'],
  ['plancha', 'plank'],
  ['abdominales', 'sit up'],
  ['crunch', 'crunch'],
  ['puente de gluteos', 'glute bridge'],
  ['hip thrust', 'hip thrust'],
  ['prensa de piernas', 'leg press'],
  ['extension de cuadriceps', 'leg extension'],
  ['extension de espalda', 'back extension'],
  ['hiperextension', 'back extension'],
  ['gemelos', 'calf raise'],
  ['flexiones de brazos', 'push up'],
  ['flexiones', 'push up'],
  ['burpees', 'burpee'],
  ['saltos al cajon', 'box jump'],
  ['saltos', 'jump'],
  ['encogimientos', 'shrug'],
  ['face pull', 'face pull'],
  ['pull over', 'pullover'],
  ['subida al cajon', 'box step up'],
  ['step up', 'step up'],
  ['abduccion de cadera', 'hip abduction'],
  ['aduccion de cadera', 'hip adduction'],
  ['patada de gluteo', 'glute kickback'],
  ['buenos dias', 'good morning'],
  ['giro ruso', 'russian twist'],
  ['rueda abdominal', 'ab wheel rollout'],
  ['mountain climbers', 'mountain climber'],
  ['escaladores', 'mountain climber'],
  ['cuerda de batalla', 'battle rope'],
  ['swing con kettlebell', 'kettlebell swing'],
];

function normalizeName(exerciseName: string): string {
  return exerciseName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function translateToSearchTerm(normalized: string): string | null {
  for (const [spanish, english] of ES_TO_EN_TERMS) {
    if (normalized.includes(spanish)) {
      return english;
    }
  }

  return null;
}

/**
 * Builds a list of increasingly generic search terms to try against ExerciseDB.
 * A precise multi-word translation ("incline bench press") is tried first; if
 * that has no match, we fall back to shorter suffixes ("bench press", "press")
 * since ExerciseDB's catalog doesn't cover every specific variant, and finally
 * to the raw (untranslated) name in case it's already an English loanword.
 */
function buildSearchCandidates(exerciseName: string): string[] {
  const normalized = normalizeName(exerciseName);
  const translated = translateToSearchTerm(normalized);
  const candidates: string[] = [];

  if (translated) {
    candidates.push(translated);

    const words = translated.split(' ');
    for (let start = 1; start < words.length; start += 1) {
      candidates.push(words.slice(start).join(' '));
    }
  }

  if (!candidates.includes(normalized)) {
    candidates.push(normalized);
  }

  return candidates;
}

interface ExerciseDbEntry {
  exerciseId: string;
  name: string;
  gifUrl: string;
}

async function searchExerciseDb(searchTerm: string): Promise<string | null> {
  const url = `${EXERCISEDB_BASE_URL}/exercises?name=${encodeURIComponent(searchTerm)}&limit=1`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

    if (!response.ok) {
      logger.warn('ExerciseDB lookup returned a non-ok status', { status: response.status, searchTerm });
      return null;
    }

    const payload = (await response.json()) as { data?: ExerciseDbEntry[] };
    return payload.data?.[0]?.gifUrl ?? null;
  } catch (error) {
    logger.warn('ExerciseDB lookup failed', { error, searchTerm });
    return null;
  }
}

export async function fetchExerciseGifUrl(exerciseName: string): Promise<string | null> {
  const cacheKey = exerciseName.trim().toLowerCase();

  if (gifCache.has(cacheKey)) {
    return gifCache.get(cacheKey) ?? null;
  }

  let gifUrl: string | null = null;

  for (const searchTerm of buildSearchCandidates(exerciseName)) {
    gifUrl = await searchExerciseDb(searchTerm);
    if (gifUrl) {
      break;
    }
  }

  gifCache.set(cacheKey, gifUrl);
  return gifUrl;
}
