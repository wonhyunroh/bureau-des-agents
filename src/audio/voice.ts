// La voix de 강지영 (ElevenLabs, en coréen, dans public/voice/ko ; les .mp3 d’origine en français restent dans public/voice) : la visite guidée du bureau, et quelques répliques
// pendant les missions. La musique baisse pendant qu'il parle.
import { jukebox } from './music.ts';

export type Line =
  | 'parti' | 'equipe' | 'accomplie' | 'feu-vert' | 'afterwork'
  | 'visite-1' | 'visite-2' | 'visite-3' | 'visite-4' | 'visite-5' | 'visite-6' | 'visite-7' | 'visite-8';

/** Les sous-titres en coréen des répliques de mission (la visite guidée a les siens dans tour.ts). */
const SUBTITLE: Partial<Record<Line, string>> = {
  parti: '좋아요, 바로 시작할게요!',
  equipe: '팀을 불렀어요. 다들 자리로!',
  'feu-vert': '대표님, 허락이 필요해요!',
  accomplie: '미션 완료!',
  afterwork: '오늘 일은 끝! 퇴근 파티 시간이에요!',
};

let onSub: ((text: string | null) => void) | null = null;
/** Le store écoute les sous-titres (voice.ts n'importe pas le store). */
export function onSubtitle(cb: (text: string | null) => void) { onSub = cb; }

/** une adresse neuve à chaque chargement : jamais une ancienne voix restée en cache */
const LOADED = Date.now().toString(36);

let enabled = true;
let current: HTMLAudioElement | null = null;
let lastAt = 0;

export function setVoice(on: boolean) {
  enabled = on;
  if (!on) stopVoice();
}

export function stopVoice() {
  if (current) { current.pause(); current = null; }
  onSub?.(null);
  jukebox.duck(false);
}

/**
 * Fait parler Max. Renvoie une promesse tenue à la fin de la réplique (tout de suite si la voix est coupée).
 * `force` : la visite guidée passe même juste après une autre réplique.
 */
export function say(line: Line, force = false): Promise<void> {
  if (!enabled) return Promise.resolve();
  const now = performance.now();
  if (!force && now - lastAt < 2500) return Promise.resolve();
  lastAt = now;
  stopVoice();
  const a = new Audio(`/voice/ko/${line}.mp3?v=${LOADED}`);
  a.volume = 0.95;
  current = a;
  jukebox.duck(true);
  onSub?.(SUBTITLE[line] ?? null);
  return new Promise((resolve) => {
    const done = () => {
      if (current === a) { current = null; onSub?.(null); jukebox.duck(false); }
      resolve();
    };
    a.addEventListener('ended', done);
    a.addEventListener('error', done);
    a.play().catch(done);
  });
}
