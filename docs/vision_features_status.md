# Estado de las 3 Propuestas Vision — TrainSmart AI

> Documento generado el 2026-07-10. Resume qué está implementado, qué funciona,
> qué falta y qué se recomienda para cada una de las tres propuestas visuales.

---

## Propuesta 1: Análisis del Entorno y Equipo Disponible

### Estado: ✅ COMPLETADA

### Qué se hizo

- **Ximilar integration**: Se usa `photo/tags/v2/tags` para detectar objetos en la foto del espacio de entrenamiento.
- **EQUIPMENT_RULES**: Mapeo de tags de Ximilar a 10 categorías de equipo (mancuernas, barra, banda elástica, colchoneta, banco, etc.).
- **SPACE_RULES**: Mapeo de tags a 4 tipos de espacio (interior, exterior, piso, garaje).
- **`buildTrainingContext()`**: Genera un string de restricciones que se inyecta en el prompt del LLM para generar rutinas adaptadas al equipo visible.
- **Integración con rutinas**: `getEnvironmentContextSnapshot()` se consume en `routine-generation.service.ts` → `buildRoutineContext()` → prompt del LLM. Si no hay análisis, el prompt indica: "Diseña la rutina para que pueda hacerse sin máquinas, con peso corporal".
- **Frontend (Routine.tsx)**: Upload de foto, visualización de resultado (imagen, resumen, espacio, equipo, contexto), botón de eliminar análisis guardado.
- **Persistencia**: Tabla `environment_analyses` + bucket `environment-images-private` con RLS. Upsert: re-analizar reemplaza el anterior.
- **Endpoints**: `POST /api/vision/environment/analyze`, `GET /api/vision/environment/latest`, `DELETE /api/vision/environment/latest`.
- **Tests**: 3 tests mocked (guardar, signed URL fallido, eliminar) + 1 live smoke test (opt-in).

### Qué funciona bien

- Pipeline completo end-to-end: foto → Ximilar → reglas → contexto → prompt LLM → rutina adaptada.
- Upsert: solo se mantiene el análisis más reciente (diseño correcto para este caso).
- Resiliencia: si falla el signed URL, la respuesta no crashea.
- RLS: usuario solo ve sus propios análisis.

### Qué falta o se puede mejorar

| Item | Prioridad | Descripción |
|------|-----------|-------------|
| Reglas de equipo limitadas | Media | Solo 10 categorías. Faltan: leg press, cable machine, smith machine, rowing machine, etc. |
| Sin umbrales de probabilidad | Baja | `pickOutputsFromRules()` matchea por nombre sin considerar `prob`. Un tag con prob 0.31 se trata igual que uno con 0.99. |
| Detección de espacio muy básica | Baja | Solo 4 reglas (interior/exterior/piso/garaje). No distingue dormitorio, sala, gimnasio comercial, parque, etc. |

---

## Propuesta 2: Análisis Visual de Alimentación

### Estado: ✅ COMPLETADA

### Qué se hizo

- **Ximilar integration**: Se usa `photo/tags/v2/tags` para detectar componentes alimentarios.
- **FOOD_GROUP_RULES**: Mapeo de ~47 tags de Ximilar a 5 grupos alimentarios (proteína, carbohidratos, vegetales, fruta, grasas).
- **Campos analíticos generados**:
  - `summary` — qué componentes detecta el plato.
  - `balance_assessment` — evalúa si el plato está balanceado o incompleto (8 ramas de análisis).
  - `protein_strength` — estima la claridad de la fuente de proteína (probabilidad promedio de tags proteicos).
  - `portion_estimate` — porción visual (amplia/media/ligera/difícil de estimar).
  - `portion_detail` — lectura más granular basada en cantidad de tags relevantes.
  - `missing_components` — qué grupos faltan.
  - `educational_feedback` — notas sobre grupos ausentes.
  - `goal_alignment` — lectura según objetivo del usuario (ganar músculo/perder grasa/fuerza/movilidad/general).
  - `practical_tip` — sugerencia breve.
- **Frontend (Progress.tsx)**: Upload de foto, visualización completa de todos los campos, historial reciente.
- **Persistencia**: Tabla `meal_analyses` + bucket `meal-images-private` con RLS. Append-only (cada foto crea un registro nuevo).
- **Endpoints**: `POST /api/vision/nutrition/analyze`, `GET /api/vision/nutrition/latest`, `GET /api/vision/nutrition/history`.
- **Tests**: 1 test mocked (flujo completo + asserts de todos los campos) + 1 live smoke test.

### Qué funciona bien

- Pipeline completo: foto → Ximilar → grupos alimentarios → análisis con objetivo → persistencia → frontend.
- `goal_alignment` usa el objetivo real del perfil del usuario desde Firestore.
- Los 11 campos solicitados se computan, persisten y renderizan.
- Historial con soporte de límite.
- `protein_strength` y `portion_detail` se persisten en la DB (migración 012).

### Qué falta o se puede mejorar

| Item | Prioridad | Descripción |
|------|-----------|-------------|
| `buildPracticalTip()` es código muerto | Alta | La función `buildPracticalTip(goal, groups)` (con lenguaje específico por objetivo) existe pero nunca se llama. El enriquecimiento usa `buildGenericPracticalTip()` que ignora el objetivo. |
| Sin endpoint DELETE | Media | Los usuarios no pueden eliminar análisis de comida que ya no quieren. |
| Sin estimación de calorías/macros | Baja | El análisis es puramente visual y educativo. No intenta estimar calorías, gramos de proteína ni macros. Esto es intencional por diseño. |
| Reglas en inglés only | Baja | `FOOD_GROUP_RULES` matchea tags en inglés de Ximilar. Si Ximilar devuelve tags en español, no coincidirían. |

---

## Propuesta 3: Seguimiento Visual del Progreso Corporal

### Estado: ✅ COMPLETADA (con mejoras recientes)

### Qué se hizo

- **Ximilar integration dual**: Se usan dos endpoints en paralelo:
  1. `photo/tags/v2/tags` — tagging genérico de la imagen.
  2. `identity/v2/person` — detección de personas (con fallback si no está disponible en la cuenta).
- **Filtrado de ruido**: Lista `NOISE_TAGS` con ~30 tags subjetivos/irrelevantes que Ximilar devuelve para cualquier persona (`sexy`, `young`, `strong`, `beautiful`, `illustration`, etc.). Estos se excluyen del análisis.
- **Señales corporales (body signals)**: Sistema de puntuación que clasifica tags en 3 categorías:
  - `MUSCLE_SIGNALS` — 28 tags (muscle, bicep, abs, definition, toned, etc.)
  - `WEIGHT_SIGNALS` — 11 tags (fat, weight, overweight, belly, big, etc.)
  - `LEAN_SIGNALS` — 10 tags (lean, thin, slim, ripped, etc.)
  - Cada categoría suma las probabilidades de sus tags. Se calcula un `balance = muscle - weight`.
- **`buildPhysicalTrend()`**: Compara el balance de señales entre entrada actual y anterior:
  - Balance mejoró >0.5 → "Señal de mejora física"
  - Balance empeoró >0.5 → "Señal de cambio físico"
  - Diferencia ≤0.2 → "No se aprecia cambio significativo"
  - Señales débiles → "Comparación poco confiable"
- **`buildBodyReadingFromSignals()`**: Lectura basada en fuerza de señales (>0.6 = claro, >0.3 = parcial, <0.3 = débil).
- **Postura inferida**: `buildPostureInferred()` mapea tags a posture via POSTURE_RULES (frontal, lateral, posterior, pose, no determinada).
- **Zonas corporales visibles**: `buildVisibleBodyZones()` detecta torso, brazos, piernas, espalda, abdomen, glúteos.
- **Detección de personas con fallback**: `detectPeopleWithFallback()` intenta `identity/v2/person`, y si falla (404 en cuenta de test), devuelve resultado vacío y agrega warning.
- **Conteo inferido**: Si person detection no está disponible, infiere 1 persona si hay tags `person`, `man`, `woman`.
- **Change summary**: Compara tags de focus, tags visuales, y tendencia física entre entradas.
- **Frontend (Progress.tsx)**: Upload, visualización completa de todos los campos, historial.
- **Persistencia**: Tabla `body_progress_entries` + bucket `body-progress-images-private` con RLS. FK auto-referenciada `compared_to_entry_id`.
- **Endpoints**: `POST /api/vision/body-progress/analyze`, `GET /api/vision/body-progress/latest`, `GET /api/vision/body-progress/history`.
- **Tests**: 1 test mocked (flujo completo + comparación) + 1 live smoke test.

### Qué funciona bien

- El más sofisticado de los tres features. Doble llamada a Ximilar con fallback elegante.
- El filtrado de ruido (30 tags) evita que tags genéricos contaminen el análisis.
- El sistema de señales cuantifica la composición corporal de forma aproximada y permite comparaciones reales entre entradas.
- La comparación entry-to-entry con `compared_to_entry_id` vincula automáticamente las fotos.
- Los warnings de calidad cubren múltiples modos de fallo.
- Todos los campos se computan, persisten y renderizan.

### Qué falta o se puede mejorar

| Item | Prioridad | Descripción |
|------|-----------|-------------|
| Bug: `enrichBodyProgressEntry()` pasa `null` como previous | Alta | Al cargar entradas vía `/latest` o `/history`, `buildBodyReadingFromSignals()` recibe `null` como previous, así que la lectura no tiene contexto de la entrada anterior. Solo `analyzeMyBodyProgress()` pasa el `previousEntry` real. |
| Sin endpoint DELETE | Media | Los usuarios no pueden eliminar entradas de progreso corporal. |
| Detección de personas es binaria | Media | El fallback de person detection solo infiere 0 o 1 persona desde tags. No hay forma de detectar 2+ personas sin `identity/v2/person`. |
| Sin análisis temporal | Baja | No considera el tiempo entre fotos (ej: "esta foto es de 3 meses después de la anterior"). La comparación es puramente visual. |
| Señales basadas en nombre de tag | Baja | Un tag solo puede contribuir a una categoría de señal. No hay análisis cruzado entre categorías. |
| Sin endpoint de eliminación masiva | Baja | No hay forma de limpiar todo el historial de un usuario de golpe. |

---

## Resumen General

### Lo que funciona end-to-end

| Feature | Upload | Ximilar | Análisis | DB | Frontend | Integración |
|---------|--------|---------|----------|-----|----------|-------------|
| Entorno | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ con rutinas LLM |
| Alimentación | ✅ | ✅ | ✅ (11 campos) | ✅ | ✅ | — |
| Progreso corporal | ✅ | ✅ | ✅ (12+ campos) | ✅ | ✅ | — |

### Bugs conocidos

1. **`buildPracticalTip()` es código muerto** — nunca se llama, el practical tip usa la versión genérica que ignora el objetivo.
2. **`enrichBodyProgressEntry()` no pasa previous a `buildBodyReadingFromSignals()`** — las lecturas cargadas desde `/latest` o `/history` no tienen contexto de comparación.

### Lo que recomiendo como siguiente paso

1. **Arreglar los 2 bugs** — prioridad inmediata.
2. **Agregar endpoints DELETE** para nutrition y body progress (consistencia con environment).
3. **Activar `buildPracticalTip()`** — conectar la función que ya existe y que genera tips más específicos por objetivo.
4. **Agregar rate limiting** a los endpoints `/analyze` para evitar abuso de la API de Ximilar.
5. **Agregar validación de tamaño en backend** — actualmente solo el frontend valida el límite de 4MB.
6. **Considerar redimensionar imágenes** antes de enviar a Ximilar para reducir payloads grandes.
7. **Tests edge cases** — imágenes malformadas, timeouts de Ximilar, requests concurrentes.
