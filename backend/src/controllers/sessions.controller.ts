import {
  addExerciseToSession,
  createMySession,
  finishMySession,
  getMySession,
  listMySessions,
} from '../services/sessions.service';
import { getRequestAuth, getRequestSupabase } from '../middlewares/auth.middleware';
import { asyncHandler, sendSuccess } from '../utils/api-response';

export const listMySessionsController = asyncHandler(async (req, res) => {
  const sessions = await listMySessions(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.query as never,
  );
  return sendSuccess(res, sessions);
});

export const createMySessionController = asyncHandler(async (req, res) => {
  const session = await createMySession(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.body,
  );
  return sendSuccess(res, session, 201);
});

export const getMySessionController = asyncHandler(async (req, res) => {
  const session = await getMySession(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.params.sessionId,
  );
  return sendSuccess(res, session);
});

export const addSessionExerciseController = asyncHandler(async (req, res) => {
  const exercise = await addExerciseToSession(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.params.sessionId,
    req.body,
  );

  return sendSuccess(res, exercise, 201);
});

export const finishMySessionController = asyncHandler(async (req, res) => {
  const session = await finishMySession(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.params.sessionId,
    req.body,
  );

  return sendSuccess(res, session);
});
