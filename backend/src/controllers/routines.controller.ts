import {
  approveRoutineVersion,
  discardRoutineVersion,
} from '../services/routine-approval.service';
import {
  generateInitialRoutine,
  regenerateRoutine,
} from '../services/routine-generation.service';
import {
  getCurrentRoutineDashboard,
  getCurrentRoutineToday,
  getMyRoutine,
  getMyRoutineVersion,
  getMyRoutineVersions,
  listMyRoutines,
} from '../services/routines.service';
import { getRequestAuth, getRequestSupabase } from '../middlewares/auth.middleware';
import { asyncHandler, sendSuccess } from '../utils/api-response';

export const listMyRoutinesController = asyncHandler(async (req, res) => {
  const routines = await listMyRoutines(getRequestSupabase(req), getRequestAuth(req));
  return sendSuccess(res, routines);
});

export const getMyRoutineController = asyncHandler(async (req, res) => {
  const routine = await getMyRoutine(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.params.routineId,
  );
  return sendSuccess(res, routine);
});

export const getMyRoutineVersionsController = asyncHandler(async (req, res) => {
  const versions = await getMyRoutineVersions(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.params.routineId,
  );
  return sendSuccess(res, versions);
});

export const getMyRoutineVersionController = asyncHandler(async (req, res) => {
  const version = await getMyRoutineVersion(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.params.versionId,
  );
  return sendSuccess(res, version);
});

export const generateRoutineController = asyncHandler(async (req, res) => {
  const result = await generateInitialRoutine(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.body,
  );
  return sendSuccess(
    res,
    {
      ...result,
      message: 'Routine generated successfully. Review and approve it before activation.',
    },
    201,
  );
});

export const regenerateRoutineController = asyncHandler(async (req, res) => {
  const result = await regenerateRoutine(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.params.routineId,
    req.body,
  );

  return sendSuccess(
    res,
    {
      ...result,
      message: 'New proposed routine version generated successfully.',
    },
    201,
  );
});

export const approveRoutineVersionController = asyncHandler(async (req, res) => {
  const version = await approveRoutineVersion(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.params.versionId,
  );
  return sendSuccess(res, {
    version,
    message: 'Routine version approved and activated.',
  });
});

export const discardRoutineVersionController = asyncHandler(async (req, res) => {
  const version = await discardRoutineVersion(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.params.versionId,
  );
  return sendSuccess(res, {
    version,
    message: 'Routine version discarded.',
  });
});

export const getCurrentRoutineDashboardController = asyncHandler(async (req, res) => {
  const dashboard = await getCurrentRoutineDashboard(
    getRequestSupabase(req),
    getRequestAuth(req),
  );
  return sendSuccess(res, dashboard);
});

export const getCurrentRoutineTodayController = asyncHandler(async (req, res) => {
  const today = await getCurrentRoutineToday(
    getRequestSupabase(req),
    getRequestAuth(req),
    typeof req.query.day_index === 'number' ? req.query.day_index : undefined,
  );

  return sendSuccess(res, today);
});
