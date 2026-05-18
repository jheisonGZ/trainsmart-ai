import { getRequestAuth, getRequestSupabase } from '../middlewares/auth.middleware';
import {
  generateOrGetRoutineAudio,
  getRoutineAudioAccess,
} from '../services/routineAudio.service';
import { asyncHandler, sendSuccess } from '../utils/api-response';

export const generateRoutineAudioController = asyncHandler(async (req, res) => {
  const access = await generateOrGetRoutineAudio(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.params.sessionId,
  );

  return sendSuccess(res, access, 201);
});

export const getRoutineAudioController = asyncHandler(async (req, res) => {
  const access = await getRoutineAudioAccess(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.params.sessionId,
  );

  return sendSuccess(res, access);
});
