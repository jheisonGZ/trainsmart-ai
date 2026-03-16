INSERT INTO public.exercises (name, primary_muscle, equipment, difficulty, description, safety_tips, contraindications)
VALUES
('Push-Up', 'chest', 'none', 'beginner', 'Ejercicio basico de empuje para pecho y triceps.', 'Mantener abdomen firme y cuerpo alineado.', 'Dolor agudo de muneca u hombro'),
('Incline Push-Up', 'chest', 'none', 'beginner', 'Version mas sencilla del push-up con manos elevadas.', 'Usa una superficie estable y controla la bajada.', 'Dolor agudo de muneca'),
('Lat Pulldown', 'back', 'machine', 'beginner', 'Jalon para espalda en maquina.', 'Lleva la barra al pecho y evita jalar detras del cuello.', 'Dolor agudo de hombro'),
('Seated Cable Row', 'back', 'cables', 'beginner', 'Remo sentado para espalda media.', 'Mantener pecho arriba y espalda neutra.', 'Dolor lumbar agudo'),
('Bodyweight Squat', 'legs', 'none', 'beginner', 'Sentadilla basica con peso corporal.', 'Rodillas alineadas con los pies y control del rango.', 'Dolor agudo de rodilla o cadera'),
('Goblet Squat', 'legs', 'dumbbells', 'beginner', 'Sentadilla con mancuerna al pecho.', 'Mantener el tronco erguido y bajar con control.', 'Dolor agudo de rodilla'),
('Leg Press', 'legs', 'machine', 'beginner', 'Prensa de piernas en maquina.', 'No bloquear rodillas y controlar la profundidad.', 'Dolor agudo de rodilla o espalda'),
('Dumbbell Shoulder Press', 'shoulders', 'dumbbells', 'beginner', 'Press por encima de la cabeza con mancuernas.', 'Evitar arquear la espalda y controlar el peso.', 'Dolor agudo de hombro'),
('Lateral Raise', 'shoulders', 'dumbbells', 'beginner', 'Elevacion lateral para deltoides.', 'Usar poco peso y elevar hasta linea de hombros.', 'Pinzamiento de hombro'),
('Bicep Curl', 'arms', 'dumbbells', 'beginner', 'Curl basico para biceps.', 'Mantener codos pegados al cuerpo.', 'Dolor agudo de codo'),
('Tricep Pushdown', 'arms', 'cables', 'beginner', 'Extension de triceps en polea.', 'Fijar codos al costado y extender con control.', 'Dolor agudo de codo'),
('Plank', 'core', 'none', 'beginner', 'Plancha isometrica para estabilidad del core.', 'Mantener linea recta sin hundir la cadera.', 'Dolor lumbar agudo'),
('Dead Bug', 'core', 'none', 'beginner', 'Ejercicio de estabilidad lumbar y abdominal.', 'Mantener espalda baja pegada al suelo.', 'Dolor lumbar no tolerable'),
('Jumping Jack', 'cardio', 'none', 'beginner', 'Cardio basico de bajo requerimiento tecnico.', 'Aterrizar suave y controlar el ritmo.', 'Sensibilidad al impacto'),
('Cat-Cow Stretch', 'mobility', 'none', 'beginner', 'Movilidad suave para columna.', 'Mover lento y acompanar con respiracion.', 'Dolor severo de espalda')
ON CONFLICT (name) DO UPDATE SET
  primary_muscle = EXCLUDED.primary_muscle,
  equipment = EXCLUDED.equipment,
  difficulty = EXCLUDED.difficulty,
  description = EXCLUDED.description,
  safety_tips = EXCLUDED.safety_tips,
  contraindications = EXCLUDED.contraindications,
  updated_at = now();
