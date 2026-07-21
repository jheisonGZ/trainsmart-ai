import { getRequestAuth, getRequestSupabase } from '../middlewares/auth.middleware';
import { generateBodyProgressAnalysisNarration } from '../services/analysisNarration.service';
import {
  analyzeAndSaveBodyProgressImage,
  clearMyBodyProgressAnalyses,
  listMyBodyProgressAnalyses,
} from '../services/bodyProgressAnalysis.service';
import { asyncHandler, sendSuccess, ValidationError } from '../utils/api-response';

export const createBodyProgressAnalysisController = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('An image file is required.');
  }

  const result = await analyzeAndSaveBodyProgressImage(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.file.buffer,
    req.file.mimetype,
  );

  return sendSuccess(res, result, 201);
});

export const listBodyProgressAnalysesController = asyncHandler(async (req, res) => {
  const analyses = await listMyBodyProgressAnalyses(getRequestSupabase(req), getRequestAuth(req));
  return sendSuccess(res, analyses);
});

export const clearBodyProgressAnalysesController = asyncHandler(async (req, res) => {
  await clearMyBodyProgressAnalyses(getRequestSupabase(req), getRequestAuth(req));
  return sendSuccess(res, { cleared: true });
});

export const createBodyProgressAnalysisNarrationController = asyncHandler(async (req, res) => {
  const access = await generateBodyProgressAnalysisNarration(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.params.id,
  );

  return sendSuccess(res, access, 201);
});
