import { useEffect, useState } from "react";
import { Dumbbell } from "lucide-react";

import { api } from "../lib/api";
import "./ExerciseGif.css";

const gifCache = new Map<string, string | null>();
const inflightRequests = new Map<string, Promise<string | null>>();

export function useExerciseGifUrl(name: string) {
  const [gifUrl, setGifUrl] = useState<string | null>(gifCache.get(name) ?? null);
  const [loading, setLoading] = useState(!gifCache.has(name));

  useEffect(() => {
    if (gifCache.has(name)) {
      setGifUrl(gifCache.get(name) ?? null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    let request = inflightRequests.get(name);

    if (!request) {
      request = api
        .get<{ gif_url: string | null }>("/exercises/gif", { name })
        .then((result) => result.gif_url)
        .catch(() => null)
        .finally(() => {
          inflightRequests.delete(name);
        });
      inflightRequests.set(name, request);
    }

    request.then((url) => {
      gifCache.set(name, url);

      if (active) {
        setGifUrl(url);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [name]);

  return { gifUrl, loading };
}

export default function ExerciseGif({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const { gifUrl, loading } = useExerciseGifUrl(name);
  const [imgFailed, setImgFailed] = useState(false);
  const sizeClass = size === "lg" ? " exercise-gif--lg" : "";

  if (loading) {
    return <div className={`exercise-gif exercise-gif--loading${sizeClass}`} />;
  }

  if (!gifUrl || imgFailed) {
    return (
      <div className={`exercise-gif exercise-gif--empty${sizeClass}`}>
        <Dumbbell size={size === "lg" ? 30 : 18} />
      </div>
    );
  }

  return (
    <div className={`exercise-gif${sizeClass}`}>
      <img src={gifUrl} alt={name} loading="lazy" onError={() => setImgFailed(true)} />
    </div>
  );
}
