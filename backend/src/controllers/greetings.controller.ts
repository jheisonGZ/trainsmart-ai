import { getRequestAuth, getRequestSupabase } from '../middlewares/auth.middleware';
import {
  generateSpeechAudio,
  generateWelcomeGreetingAudio,
} from '../services/welcomeGreeting.service';
import { asyncHandler } from '../utils/api-response';

export const getWelcomeGreetingAudioController = asyncHandler(async (req, res) => {
  const audio = await generateWelcomeGreetingAudio(
    getRequestSupabase(req),
    getRequestAuth(req),
  );

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', audio.length);
  return res.status(200).send(audio);
});

export const createSpeechAudioController = asyncHandler(async (req, res) => {
  const audio = await generateSpeechAudio(getRequestAuth(req), req.body);

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', audio.length);
  return res.status(200).send(audio);
});
