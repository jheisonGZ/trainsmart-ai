import {
  getExerciseDetail,
  getExerciseMediaList,
  listExerciseLibrary,
} from '../services/exercises.service';
import { getRequestAuth, getRequestSupabase } from '../middlewares/auth.middleware';
import { asyncHandler, sendSuccess } from '../utils/api-response';

export const listExercisesController = asyncHandler(async (req, res) => {
  const exercises = await listExerciseLibrary(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.query as never,
  );
  return sendSuccess(res, exercises);
});

export const getExerciseController = asyncHandler(async (req, res) => {
  const exercise = await getExerciseDetail(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.params.id,
  );
  return sendSuccess(res, exercise);
});

export const getExerciseMediaController = asyncHandler(async (req, res) => {
  const media = await getExerciseMediaList(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.params.id,
  );
  return sendSuccess(res, media);
});
