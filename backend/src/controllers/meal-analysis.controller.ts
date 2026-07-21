import { getRequestAuth, getRequestSupabase } from '../middlewares/auth.middleware';
import { generateMealAnalysisNarration } from '../services/analysisNarration.service';
import {
  analyzeAndSaveMealImage,
  clearMyMealAnalyses,
  listMyMealAnalyses,
} from '../services/mealAnalysis.service';
import { asyncHandler, sendSuccess, ValidationError } from '../utils/api-response';

export const createMealAnalysisController = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('An image file is required.');
  }

  const result = await analyzeAndSaveMealImage(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.file.buffer,
    req.file.mimetype,
  );

  return sendSuccess(res, result, 201);
});

export const listMealAnalysesController = asyncHandler(async (req, res) => {
  const analyses = await listMyMealAnalyses(getRequestSupabase(req), getRequestAuth(req));
  return sendSuccess(res, analyses);
});

export const clearMealAnalysesController = asyncHandler(async (req, res) => {
  await clearMyMealAnalyses(getRequestSupabase(req), getRequestAuth(req));
  return sendSuccess(res, { cleared: true });
});

export const createMealAnalysisNarrationController = asyncHandler(async (req, res) => {
  const access = await generateMealAnalysisNarration(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.params.id,
  );

  return sendSuccess(res, access, 201);
});
