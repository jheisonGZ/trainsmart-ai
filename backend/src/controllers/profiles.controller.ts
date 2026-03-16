import {
  confirmMyProfile,
  createMyProfile,
  getMyProfile,
  updateMyProfile,
} from '../services/profiles.service';
import { getRequestAuth, getRequestSupabase } from '../middlewares/auth.middleware';
import { NotFoundError, asyncHandler, sendSuccess } from '../utils/api-response';

export const getMyProfileController = asyncHandler(async (req, res) => {
  const profile = await getMyProfile(getRequestSupabase(req), getRequestAuth(req));

  if (!profile) {
    throw new NotFoundError('Profile not found.');
  }

  return sendSuccess(res, profile);
});

export const createMyProfileController = asyncHandler(async (req, res) => {
  const profile = await createMyProfile(getRequestSupabase(req), getRequestAuth(req), req.body);
  return sendSuccess(res, profile, 201);
});

export const updateMyProfileController = asyncHandler(async (req, res) => {
  const profile = await updateMyProfile(getRequestSupabase(req), getRequestAuth(req), req.body);
  return sendSuccess(res, profile);
});

export const confirmMyProfileController = asyncHandler(async (req, res) => {
  const profile = await confirmMyProfile(getRequestSupabase(req), getRequestAuth(req));
  return sendSuccess(res, profile);
});
