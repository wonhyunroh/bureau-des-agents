// En bas de l'écran, comme dans un jeu de rôle : Max te parle (son texte s'écrit lettre par lettre),
// et tu lui réponds : au clavier ou à la voix. C'est le seul endroit où taper : une demande, et l'équipe s'y met.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ROLES } from '../../shared/activity.ts';
import { sfx } from '../audio/sfx.ts';
import { world } from '../engine/instance.ts';
import { robotSprite } from '../engine/robots.ts';
import { savePref, useOffice } from '../state/store.ts';
import { tidy } from './tidy.ts';
import { dictationHelp, useDictation } from './voice.ts';

export const EXAMPLES: { label: string; prompt: string }[] = [
  {
    label: '🔎 경쟁사 분석',
    prompt: '내 주요 경쟁사 5곳을 분석해 줘. 각 회사의 상품, 가격, 고객들이 하는 말을 정리해 줘. 경쟁사마다 리서처를 한 명씩 붙이고, 마지막에 비교표와 차별화할 수 있는 구체적인 아이디어 3가지를 줘.',
  },
  {
    label: '📰 이번 주 AI 소식',
    prompt: '이번 주 AI 소식을 정리해 줘. 창업가에게 중요한 새 소식 5가지(도구, 발표, 활용법)를 골라서, 각각 나에게 어떤 변화가 있는지 한 문장과 출처 링크를 붙여 줘.',
  },
  {
    label: '🌐 판매 페이지',
    prompt: '내 상품의 판매 페이지를 만들어 줘. 파일 하나로 된 모던한 웹페이지로, 강렬한 제목, 장점, 나중에 채울 고객 후기 섹션, 행동 유도 버튼을 넣어 줘. 작가에게 한 번 검토도 받아 줘.',
  },
  {
    label: '✍️ 링크드인 글 3개',
    prompt: '내 일에 대한 링크드인 글 3개를 써 줘. 글마다 첫 문장을 다르게 하고, 셋 중 가장 좋은 글로 HTML 인용 이미지도 만들어 줘.',
  },
];

const stripMd = (s: string) =>
  tidy(s).replace(/```[\s\S]*?```/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]+/g, '').replace(/^\s*[-•]\s+/gm, '• ').replace(/\n{2,}/g, '\n').trim();

/** Le texte de Max, qui s'écrit lettre par lettre, avec un petit « bip » (comme dans les vieux jeux). */
function useTypewriter(text: string, cps = 55) {
  const [n, setN] = useState(0);
  const shown = useRef('');
  useEffect(() => {
    // si le nouveau texte prolonge celui qui s'affiche, on continue ; sinon on recommence
    if (!text.startsWith(shown.current)) setN(0);
  }, [text]);
  useEffect(() => {
    if (n >= text.length) return;
    const t = setTimeout(() => {
      const step = text.length - n > 260 ? 8 : 2;
      setN((x) => Math.min(text.length, x + step));
      if (n % 6 === 0) sfx('blip', 0.85 + Math.random() * 0.3);
    }, (1000 / cps) * 2);
    return () => clearTimeout(t);
  }, [n, text, cps]);
  const out = text.slice(0, Math.min(n, text.length));
  shown.current = out;
  return { out, done: n >= text.length };
}

/** Le visage de Max, en grand, qui cligne des yeux (et sourit quand c'est fini). */
function Portrait({ happy }: { happy: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current!.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    let blink = 0;
    const draw = () => {
      const chef = world.chef;
      const eyes = happy ? 'happy' : blink > 0 ? 'blink' : chef.eyes === 'blink' ? 'open' : chef.eyes === 'happy' ? 'happy' : chef.eyes;
      g.clearRect(0, 0, 64, 64);
      g.drawImage(robotSprite('chef', 'stand', 'down', 0, eyes), 2, 0, 16, 16, 0, 0, 64, 64);
      if (blink > 0) blink--;
      else if (Math.random() < 0.02) blink = 2;
    };
    draw();
    const t = setInterval(draw, 120);
    return () => clearInterval(t);
  }, [happy]);
  return <canvas ref={ref} width={64} height={64} className="portrait" />;
}

export function Dialog() {
  const connection = useOffice((s) => s.connection);
  const claude = useOffice((s) => s.claude);
  const mission = useOffice((s) => s.mission);
  const busy = useOffice((s) => s.busySince !== null);
  const replaying = useOffice((s) => s.replaying);
  const chef = useOffice((s) => s.chef);
  const final = useOffice((s) => s.final);
  const tour = useOffice((s) => s.tour);
  const subtitle = useOffice((s) => s.subtitle);

  let text: string;
  if (tour) text = tour.text;
  else if (subtitle) text = subtitle;
  else if (connection === 'offline') text = 'Claude Code와 연결되어 있지 않아요. 사무실 폴더에서 「npm start」를 실행하면 바로 일을 시작할게요.';
  else if (claude && !claude.found) text = '이 컴퓨터에서 Claude Code를 찾을 수 없어요. 설치하고(claude.com/claude-code) 로그인한 다음, 사무실을 다시 실행해 주세요.';
  else if (!mission) text = '안녕하세요! 저는 이 사무실 팀장 관우예요. 필요한 걸 말씀해 주세요. 팀을 꾸려서 눈앞에서 바로 일을 시작할게요.';
  else if (chef.typing) text = stripMd(chef.typing);
  else if (final && !busy) text = stripMd(final.text) || (final.ok ? '다 됐어요!' : '미션이 중단됐어요.');
  else if (chef.say) text = stripMd(chef.say);
  else text = busy ? '요청을 읽는 중이에요…' : '';

  const { out } = useTypewriter(text);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [out]);

  return (
    <footer className="dialog">
      <div className="dialog-box">
        <div className="dialog-face"><Portrait happy={!!final?.ok && !busy} /></div>
        <div className="dialog-main">
          <div className="dialog-name">관우 <span>팀장</span>{replaying && <em className="pill replay">다시 재생</em>}</div>
          <div className="dialog-text" ref={box}>{out}<span className="caret" /></div>
        </div>
      </div>
      <Composer />
    </footer>
  );
}

export function AskBar() {
  const asks = useOffice(useShallow((s) => Object.values(s.asks)));
  const agents = useOffice((s) => s.agents);
  const send = useOffice((s) => s.send);
  const a = asks[0];
  if (!a) return null;
  const who = a.who === 'chef' ? '관우' : agents[a.who]?.name ?? '에이전트';
  const role = a.who === 'chef' ? 'chef' : agents[a.who]?.role ?? 'renfort';
  const answer = (allow: boolean) => { sfx(allow ? 'yes' : 'no'); send({ t: 'answer', requestId: a.requestId, allow }); };
  return (
    <div className="askbar">
      <div className="askbar-head">🙋 <b style={{ color: ROLES[role].color }}>{who}</b> · 허락이 필요해요{asks.length > 1 ? ` (외 ${asks.length - 1}건)` : ''}</div>
      <div className="askbar-label">{a.label}</div>
      {!a.full && a.detail && <pre className="askbar-detail">{a.detail}</pre>}
      <div className="askbar-actions">
        <button className="btn primary" onClick={() => answer(true)}>허락하기</button>
        <button className="btn" onClick={() => answer(false)}>거절하기</button>
      </div>
    </div>
  );
}

function Composer() {
  const mission = useOffice((s) => s.mission);
  const busy = useOffice((s) => s.busySince !== null);
  const replaying = useOffice((s) => s.replaying);
  const send = useOffice((s) => s.send);
  const draft = useOffice((s) => s.draft);
  const demo = useOffice((s) => s.connection === 'demo');
  const project = useOffice((s) => s.project);
  const [text, setText] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef(text);
  textRef.current = text;

  // un exemple choisi ailleurs (ou « demander une retouche ») remplit la zone de texte
  useEffect(() => {
    if (!draft) return;
    setText(draft === ' ' ? '' : draft);
    useOffice.setState({ draft: '' });
    setTimeout(() => area.current?.focus(), 30);
  }, [draft]);

  const getBase = useCallback(() => textRef.current, []);
  const dict = useDictation(getBase, setText);

  const mode: 'new' | 'steer' | 'retouch' = !mission ? 'new' : busy ? 'steer' : 'retouch';
  const placeholder = mode === 'new'
    ? '관우에게 원하는 걸 말해 주세요… (예: 경쟁사 5곳 분석해 줘)'
    : mode === 'steer' ? '관우에게 덧붙일 말이 있나요? 단계 사이에 읽어 볼게요.' : '관우에게 수정을 요청하거나… 새 미션을 시작해 보세요.';

  const submit = () => {
    const t = text.trim();
    if (!t || replaying) return;
    if (dict.listening) dict.stop();
    sfx('send');
    if (mode === 'new') send(project ? { t: 'start', prompt: t, folder: project } : { t: 'start', prompt: t });
    else send({ t: 'say', text: t });
    setText('');
  };

  return (
    <div className="composer">
      {!demo && !replaying && (mode === 'new' ? (
        <div className="workdir">
          <span>📁 작업 폴더: <b>{project ? tidy(project) : '새 미션 폴더'}</b></span>
          <button className="link" onClick={() => { sfx('click'); send({ t: 'pick_folder' }); }}>{project ? '바꾸기' : '내 프로젝트 고르기'}</button>
          {project && <button className="link" onClick={() => { sfx('click'); useOffice.setState({ project: null }); savePref('project', null); }}>새 폴더로</button>}
          {project && <em>팀이 이 폴더의 파일을 직접 고쳐요. 시작 전에 git 커밋으로 백업해 두면 안전해요.</em>}
        </div>
      ) : mission?.project ? (
        <div className="workdir"><span>📁 프로젝트에서 작업 중: <b>{mission.folder.split(/[\\/]/).filter(Boolean).pop()}</b></span></div>
      ) : null)}
      <div className={`composer-row ${dict.listening ? 'listening' : ''}`}>
        <textarea
          ref={area}
          value={text}
          rows={2}
          placeholder={demo ? '데모 화면이에요. 실제 버전은 내 컴퓨터에서 Claude Code로 돌아가요.' : replaying ? '다시 재생 중…' : placeholder}
          disabled={replaying}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
          }}
        />
        <button
          className={`mic ${dict.listening ? 'on' : ''}`}
          title={dict.listening ? '음성 입력 멈추기' : '음성 입력 (한국어)'}
          aria-label="음성 입력"
          disabled={replaying}
          onClick={() => (dict.listening ? dict.stop() : dict.start())}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2Z" /></svg>
        </button>
        {busy && !replaying ? (
          <>
            {text.trim() && <button className="btn primary send" onClick={submit}>보내기</button>}
            <button className="btn stop" onClick={() => { sfx('click'); send({ t: 'stop' }); }}>■ 멈추기</button>
          </>
        ) : (
          <button className="btn primary send" disabled={!text.trim() || replaying} onClick={submit}>
            {mode === 'new' ? '시작하기' : '보내기'} <span aria-hidden="true">➜</span>
          </button>
        )}
        {mode === 'retouch' && !replaying && (
          <button className="btn ghost" title="이 미션을 정리하고 처음부터 다시 시작해요" onClick={() => { sfx('click'); send({ t: 'new' }); }}>＋ 새 미션</button>
        )}
      </div>
      {dict.problem && (
        <div className="hint" onClick={dict.clearProblem}>🎙️ {dictationHelp(dict.problem)}</div>
      )}
    </div>
  );
}
