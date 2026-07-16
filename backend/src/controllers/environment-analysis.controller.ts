import { getRequestAuth, getRequestSupabase } from '../middlewares/auth.middleware';
import {
  analyzeAndSaveEnvironmentImage,
  clearMyEnvironmentAnalyses,
  listMyEnvironmentAnalyses,
} from '../services/environmentAnalysis.service';
import { asyncHandler, sendSuccess, ValidationError } from '../utils/api-response';

export const createEnvironmentAnalysisController = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('An image file is required.');
  }

  const result = await analyzeAndSaveEnvironmentImage(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.file.buffer,
    req.file.mimetype,
  );

  return sendSuccess(res, result, 201);
});

export const listEnvironmentAnalysesController = asyncHandler(async (req, res) => {
  const analyses = await listMyEnvironmentAnalyses(getRequestSupabase(req), getRequestAuth(req));
  return sendSuccess(res, analyses);
});

export const clearEnvironmentAnalysesController = asyncHandler(async (req, res) => {
  await clearMyEnvironmentAnalyses(getRequestSupabase(req), getRequestAuth(req));
  return sendSuccess(res, { cleared: true });
});
