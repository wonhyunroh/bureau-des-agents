// La dictée : tu parles, le texte s'écrit tout seul (reconnaissance vocale du navigateur, en français).
// Chrome, Edge et Safari la proposent ; Brave la bloque : on propose alors la dictée du Mac.
import { useCallback, useEffect, useRef, useState } from 'react';

type Rec = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};

function recognizer(): (new () => Rec) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useDictation(getBase: () => string, onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const rec = useRef<Rec | null>(null);

  useEffect(() => () => rec.current?.abort(), []);

  const stop = useCallback(() => { rec.current?.stop(); }, []);

  const start = useCallback(() => {
    const SR = recognizer();
    setProblem(null);
    if (!SR) { setProblem('absent'); return; }
    const r = new SR();
    r.lang = 'ko-KR';
    r.interimResults = true;
    r.continuous = true;
    const base = getBase().trim();
    r.onresult = (e) => {
      const said = Array.from(e.results).map((x) => x[0].transcript).join('').trim();
      onText((base ? base + ' ' : '') + said.charAt(0).toUpperCase() + said.slice(1));
    };
    r.onerror = (e) => {
      if (e.error !== 'aborted' && e.error !== 'no-speech') setProblem(e.error);
      setListening(false);
    };
    r.onend = () => setListening(false);
    try {
      r.start();
      rec.current = r;
      setListening(true);
    } catch { setProblem('absent'); }
  }, [getBase, onText]);

  return { listening, problem, start, stop, clearProblem: () => setProblem(null) };
}

/** Ce qu'on affiche quand la dictée du navigateur ne marche pas. */
export function dictationHelp(problem: string) {
  if (problem === 'not-allowed' || problem === 'service-not-allowed') {
    return '이 페이지에서 마이크가 차단돼 있어요. 주소창에서 허용하거나, Mac 받아쓰기를 써 보세요. fn 키(또는 🎤)를 두 번 누르고 말하면 돼요.';
  }
  return '이 브라우저는 음성 입력을 지원하지 않아요(Brave는 차단해요). Mac 받아쓰기를 써 보세요. fn 키(또는 🎤)를 두 번 누르고 말하면 돼요. Safari와 Chrome에서도 돼요.';
}
