// Les fenêtres qu'on ouvre en cliquant dans le bureau. Tout y vient de Claude Code, pour de vrai :
// la fiche d'un agent (sa mission, chacune de ses actions, son rapport), le plan de Max et son
// historique, l'équipe et ses outils, la machine, les rendus et l'aperçu des sites créés.
import { useEffect, useMemo, useState } from 'react';
import { ROLE_TOOLS, ROLES, TOOL_INFO } from '../../shared/activity.ts';
import type { PlanItem, Role } from '../../shared/protocol.ts';
import { jukebox, TRACKS } from '../audio/music.ts';
import { sfx } from '../audio/sfx.ts';
import { world } from '../engine/instance.ts';
import { savePref, teamList, useOffice, type ActView, type Tod } from '../state/store.ts';
import { useShallow } from 'zustand/react/shallow';
import { fileIcon, fmtClock, fmtDate, fmtDuration, fmtSize, readable, tilde } from './format.ts';
import { party } from './interact.ts';
import { mdToHtml } from './md.ts';
import { Avatar } from './Panel.tsx';
import { tidy } from './tidy.ts';

const ICON: Record<string, string> = {
  search: '🔎', web: '🌐', read: '📖', write: '✍️', edit: '✏️', bash: '💻', plan: '📋', skill: '🎓', mcp: '🔌', other: '⚙️',
};

function Shell({ title, sub, wide, children, onClose }: { title: React.ReactNode; sub?: React.ReactNode; wide?: boolean; children: React.ReactNode; onClose?: () => void }) {
  const close = onClose ?? (() => useOffice.setState({ modal: null }));
  return (
    <div className="modal-back" onClick={close}>
      <div className={`modal room ${wide ? 'wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="room-title"><b>{title}</b>{sub && <span>{sub}</span>}</div>
          <button className="close" onClick={close} aria-label="닫기">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/** Les fenêtres du bureau (une seule ouverte à la fois). */
export function Rooms() {
  const modal = useOffice((s) => s.modal);
  if (!modal) return null;
  switch (modal.kind) {
    case 'agent': return <AgentRoom id={modal.id} />;
    case 'board': return <BoardRoom />;
    case 'clock': return <ClockRoom />;
    case 'machine': return <MachineRoom />;
    case 'jukebox': return <JukeboxRoom />;
    case 'team': return <TeamRoom role={modal.role} />;
    case 'files': return <FilesRoom />;
    case 'preview': return <PreviewRoom missionId={modal.missionId} file={modal.file} />;
  }
}

// ── La fiche d'un agent ──
function AgentRoom({ id }: { id: string }) {
  const a = useOffice((s) => s.agents[id]);
  const live = world.actors.get(id);
  const html = useMemo(() => (a?.report ? mdToHtml(tidy(a.report)) : ''), [a?.report]);
  if (!a) return <Shell title="이 에이전트는 이제 없어요">사무실을 떠났어요.</Shell>;
  const role = ROLES[a.role];
  const working = a.status === 'working' || a.status === 'reporting';
  return (
    <Shell title={<>{a.name}</>} sub={`${role.icon} ${role.label} · ${a.task}`}>
      <div className="agent-hero" style={{ ['--c' as string]: role.color }}>
        <Avatar role={a.role} size={72} />
        <div>
          <span className={`pill-status ${a.status}`}>{working ? (live?.seated ? '작업 중' : '이동 중') : a.status === 'done' ? '작업을 마쳤어요' : '끝내지 못했어요'}</span>
          <p className="now">{working && a.act ? <><i>{ICON[a.act.kind]}</i>{a.act.label}</> : a.status === 'done' ? '보고서가 강지영 책상 위에 있어요.' : working ? '자리에 앉는 중…' : ''}</p>
          <p className="small muted">진짜 Claude Code 서브에이전트(「{role.type || '지원'}」)예요. 자기만의 도구를 써요: {ROLE_TOOLS[a.role].join(', ') || '강지영과 같은 도구'}.</p>
        </div>
      </div>
      <section className="room-sec">
        <h4>강지영이 쓴 미션</h4>
        <p className="brief">{tidy(a.prompt)}</p>
      </section>
      {a.acts.length > 0 && (
        <section className="room-sec">
          <h4>한 일 <span className="count">{`${a.acts.length}개`}</span></h4>
          <ActList acts={a.acts} />
        </section>
      )}
      {html && (
        <section className="room-sec">
          <h4>보고서</h4>
          <div className="md report" dangerouslySetInnerHTML={{ __html: html }} />
        </section>
      )}
      {a.leftAt && (
        <p className="small muted">작업 시간 {fmtDuration(a.leftAt - a.hiredAt)}{a.tools ? ` · 도구 ${a.tools}번 사용` : ''}{a.tokens ? ` · 토큰 ${a.tokens.toLocaleString('ko-KR')}개` : ''}</p>
      )}
    </Shell>
  );
}

function ActList({ acts }: { acts: ActView[] }) {
  return (
    <ul className="act-list">
      {acts.slice(-40).map((x) => (
        <li key={x.id} className={x.ok === false ? 'fail' : ''}>
          <i>{ICON[x.kind]}</i>
          <div>
            <span>{x.label}</span>
            {x.detail && x.detail !== x.label && <code>{(() => { const d = tidy(x.detail); return d.length > 160 ? d.slice(0, 159) + '…' : d; })()}</code>}
          </div>
          <time>{new Date(x.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
        </li>
      ))}
    </ul>
  );
}

// ── Le tableau : le plan, qui fait quoi, et l'historique du plan ──
function planChanges(prev: PlanItem[] | null, next: PlanItem[]): string[] {
  if (!prev) return [`강지영이 계획을 세웠어요: ${next.length}단계`];
  const out: string[] = [];
  for (const it of next) {
    const before = prev.find((p) => p.text === it.text);
    if (!before) out.push(`+ ${it.text}`);
    else if (before.status !== it.status && it.status === 'completed') out.push(`✓ ${it.text}`);
    else if (before.status !== it.status && it.status === 'in_progress') out.push(`▶ ${it.text}`);
  }
  return out;
}

function BoardRoom() {
  const plan = useOffice((s) => s.plan);
  const history = useOffice((s) => s.planHistory);
  const team = useOffice(useShallow(teamList));
  const done = plan.filter((p) => p.status === 'completed').length;
  const steps = useMemo(() => history.map((h, i) => ({ at: h.at, lines: planChanges(i ? history[i - 1].items : null, h.items) })).filter((x) => x.lines.length), [history]);
  return (
    <Shell title="강지영의 보드" sub={plan.length ? `${plan.length}단계 중 ${done}단계 완료` : '미션 계획과 누가 무엇을 하는지'}>
      {plan.length > 0 ? (
        <>
          <div className="progress"><i style={{ width: `${(done / plan.length) * 100}%` }} /></div>
          <ul className="plan big">{plan.map((p, i) => <li key={i} className={p.status}><i />{p.text}</li>)}</ul>
        </>
      ) : <p className="muted">아직 계획이 없어요. 미션이 여러 단계면 강지영이 바로 계획을 세워요.</p>}
      <section className="room-sec">
        <h4>누가 무엇을 하나요 <span className="count">{`에이전트 ${team.length}명`}</span></h4>
        {team.length ? (
          <div className="who">
            {team.map((a) => (
              <button key={a.id} className={`who-row ${a.status}`} style={{ ['--c' as string]: ROLES[a.role].color }} onClick={() => { sfx('open'); useOffice.setState({ modal: { kind: 'agent', id: a.id } }); }}>
                <Avatar role={a.role} size={26} />
                <b>{a.name}</b>
                <span className="who-task">{a.task}</span>
                <span className="who-state">{a.status === 'done' ? '✓ 보고서 제출' : a.status === 'failed' ? '✕ 못 끝냄' : a.status === 'reporting' ? '📄 보고서 제출 중' : '… 작업 중'}</span>
              </button>
            ))}
          </div>
        ) : <p className="muted small">아직 아무도 없어요.</p>}
      </section>
      {steps.length > 0 && (
        <section className="room-sec">
          <h4>계획 기록</h4>
          <ol className="timeline">
            {steps.map((s, i) => (
              <li key={i}>
                <time>{new Date(s.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
                <div>{s.lines.map((l, j) => <span key={j}>{l}</span>)}</div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </Shell>
  );
}

// ── L'horloge ──
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return now;
}

const TODS: [Tod, string][] = [['auto', 'Mac 시간대로'], ['day', '☀️ 낮'], ['evening', '🌇 저녁'], ['night', '🌙 밤']];

function ClockRoom() {
  const now = useClock();
  const tod = useOffice((s) => s.tod);
  const busySince = useOffice((s) => s.busySince);
  const workMs = useOffice((s) => s.workMs);
  const mission = useOffice((s) => s.mission);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return (
    <Shell title="사무실 시계" sub={now.toLocaleDateString('ko-KR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}>
      <div className="big-clock"><span>{hh}</span><i>:</i><span>{mm}</span><small>{ss}</small></div>
      {mission && (busySince
        ? <p className="center">미션 진행 시간 <b>{fmtClock(workMs + (now.getTime() - busySince))}</b> · {mission.title}</p>
        : <p className="center">지난 미션: <b>{fmtClock(workMs)}</b> 작업 · {mission.title}</p>)}
      <p className="center muted small">팀은 잠들지 않아요. 새벽 3시에도 낮 12시처럼 일해요.</p>
      <div className="seg">
        {TODS.map(([v, l]) => (
          <button key={v} className={tod === v ? 'on' : ''} onClick={() => { sfx('click'); useOffice.setState({ tod: v }); savePref('tod', v); }}>{l}</button>
        ))}
      </div>
    </Shell>
  );
}

// ── La machine (le serveur) : Claude Code, le modèle, l'abonnement ──
function MachineRoom() {
  const claude = useOffice((s) => s.claude);
  const settings = useOffice((s) => s.settings);
  const mission = useOffice((s) => s.mission);
  const quota = useOffice((s) => s.quota);
  const dir = useOffice((s) => s.dir);
  const connection = useOffice((s) => s.connection);
  const rows: [string, React.ReactNode][] = [
    ['Claude Code', claude?.found ? `${claude.version} · ${claude.path}` : connection === 'demo' ? '데모 (실제 미션 다시 재생)' : '찾을 수 없어요'],
    ['연결', 'Claude 구독 (API 키 없음, 사용량 과금 없음)'],
    ['강지영의 두뇌', mission?.model ? `${mission.model} (설정: ${settings.chefModel || '기본값'})` : settings.chefModel || '기본값'],
    ['팀의 두뇌', settings.teamModel === 'inherit' ? '강지영과 같아요' : settings.teamModel],
    ['허락', settings.permission === 'auto' ? '자동: 위험한 작업만 손을 들고 물어봐요' : '명령마다 먼저 물어봐요'],
    ['에너지 (5시간)', quota ? `${Math.round(quota.fiveHour * 100)}% 사용${quota.resetsAt ? `, ${new Date(quota.resetsAt * 1000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}에 충전` : ''}` : '아직 측정 전'],
    ['사무실 폴더', dir ? tilde(dir) : '—'],
    ['진행 중인 미션', mission ? tilde(mission.folder) : '없음'],
  ];
  return (
    <Shell title="서버" sub="사무실 뒤에서 돌아가는 것">
      <dl className="kv">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <section className="room-sec">
        <h4>어떻게 작동하나요</h4>
        <p className="small">강지영은 미션 폴더에서 창 없이 실행되는 진짜 Claude Code 세션이에요. 팀원들은 진짜 Claude Code 서브에이전트예요. 각자 지시사항이 있고, 자기 일에 맞는 도구만 써요. 에이전트가 도구를 쓸 때마다(검색, 페이지 읽기, 파일 쓰기) Claude Code가 사무실에 알려 주고, 사무실은 바로 보여 줘요. 타자 치는 로봇, 말풍선, 팀장 책상 위의 보고서처럼요.</p>
        <p className="small muted">제한 모드: 팀은 미션 폴더 밖으로 절대 나가지 않아요. 내 설정이나 다른 에이전트도 사무실에 들어오지 않아요.</p>
      </section>
    </Shell>
  );
}

// ── Le jukebox ──
function JukeboxRoom() {
  const music = useOffice((s) => s.music);
  const tr = TRACKS[music.index];
  return (
    <Shell title="주크박스" sub="일할 때 듣는 하우스 음악 (퇴근 후에도 좋아요)">
      <div className="now-playing">
        <div className={`vinyl ${music.playing ? 'spin' : ''}`}><i /></div>
        <div>
          <b>{tr.title}</b>
          <span>{tr.mood}</span>
          <div className="row">
            <button className="btn small" onClick={() => jukebox.prev()} aria-label="이전 곡">⏮</button>
            <button className="btn primary small" onClick={() => jukebox.toggle()}>{music.playing ? '⏸ 일시정지' : '▶ 재생'}</button>
            <button className="btn small" onClick={() => jukebox.next()} aria-label="다음 곡">⏭</button>
          </div>
        </div>
      </div>
      <label className="field volume">
        <span>볼륨</span>
        <input type="range" min={0} max={1} step={0.01} value={music.volume} onChange={(e) => jukebox.setVolume(Number(e.target.value))} />
      </label>
      <ul className="tracks">
        {TRACKS.map((t, i) => (
          <li key={t.id}>
            <button className={i === music.index ? 'on' : ''} onClick={() => jukebox.play(i)}>
              <span>{i === music.index && music.playing ? '♪' : i + 1}</span>
              <b>{t.title}</b>
              <em>{t.mood}</em>
            </button>
          </li>
        ))}
      </ul>
      <div className="row">
        <button className="btn" onClick={() => { useOffice.setState({ modal: null }); party(); }}>🪩 파티 모드</button>
        <span className="small muted">ElevenLabs Music와 Google Lyria로 사무실을 위해 만든 오리지널 곡이에요.</span>
      </div>
    </Shell>
  );
}

// ── Toute l'équipe : les métiers et leurs outils, la mission en cours, l'historique ──
function TeamRoom({ role }: { role?: Role }) {
  const [tab, setTab] = useState<'roles' | 'now' | 'history'>(role ? 'roles' : 'now');
  const team = useOffice(useShallow(teamList));
  const settings = useOffice((s) => s.settings);
  const history = useOffice((s) => s.teamHistory);
  const send = useOffice((s) => s.send);
  const connection = useOffice((s) => s.connection);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { if (tab === 'history' && connection === 'live') send({ t: 'team_history' }); }, [tab, connection, send]);
  const working = (r: Role) => [...world.actors.values()].filter((a) => a.role === r && a.seated).length;
  const roles: Role[] = ['chef', 'recherche', 'code', 'design', 'redaction', 'analyse'];
  const missions = useMemo(() => {
    const m = new Map<string, { title: string; at: number; entries: NonNullable<typeof history> }>();
    for (const e of history ?? []) {
      if (!m.has(e.missionId)) m.set(e.missionId, { title: e.missionTitle, at: e.at, entries: [] });
      m.get(e.missionId)!.entries.push(e);
    }
    return [...m.entries()];
  }, [history]);
  return (
    <Shell title="우리 팀" sub="각자 맡은 일과 도구가 있는 진짜 Claude Code 에이전트" wide>
      <div className="seg tabs">
        <button className={tab === 'now' ? 'on' : ''} onClick={() => setTab('now')}>이번 미션</button>
        <button className={tab === 'roles' ? 'on' : ''} onClick={() => setTab('roles')}>역할</button>
        <button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>기록</button>
      </div>
      {tab === 'now' && (team.length ? (
        <div className="who">
          {team.map((a) => (
            <button key={a.id} className={`who-row ${a.status}`} style={{ ['--c' as string]: ROLES[a.role].color }} onClick={() => { sfx('open'); useOffice.setState({ modal: { kind: 'agent', id: a.id } }); }}>
              <Avatar role={a.role} size={26} />
              <b>{a.name}</b>
              <span className="who-task">{ROLES[a.role].icon} {a.task}</span>
              <span className="who-state">{a.status === 'done' ? '✓ 보고서 제출' : a.status === 'failed' ? '✕ 못 끝냄' : a.act ? a.act.label : '… 작업 중'}</span>
            </button>
          ))}
        </div>
      ) : <p className="muted">아직 사무실에 아무도 없어요. 강지영에게 미션을 주면 알맞은 에이전트를 불러요.</p>)}
      {tab === 'roles' && (
        <div className="roles">
          {roles.map((r) => (
            <div key={r} className={`role-card ${role === r ? 'focus' : ''}`} style={{ ['--c' as string]: ROLES[r].color }}>
              <div className="role-head"><Avatar role={r} size={34} /><div><b>{ROLES[r].icon} {ROLES[r].label}</b><span>{r === 'chef' ? '강지영' : `에이전트 「${ROLES[r].type}」`} · 두뇌: {r === 'chef' ? settings.chefModel || '기본값' : settings.teamModel === 'inherit' ? '강지영과 같아요' : settings.teamModel}</span></div>{working(r) > 0 && <em>{working(r)}명 작업 중</em>}</div>
              <p>{ROLES[r].what}</p>
              <div className="tools">{ROLE_TOOLS[r].map((t) => <span key={t} title={TOOL_INFO[t] ?? t}>{t}<small>{TOOL_INFO[t] ?? ''}</small></span>)}</div>
            </div>
          ))}
        </div>
      )}
      {tab === 'history' && (
        connection !== 'live' ? <p className="muted">기록은 내 컴퓨터에 있어요. 보려면 Claude Code로 사무실을 실행해 주세요.</p>
          : !history ? <p className="muted">불러오는 중…</p>
            : !missions.length ? <p className="muted">아직 기록이 없어요.</p>
              : (
                <div className="hist-team">
                  {missions.map(([id, m]) => (
                    <section key={id}>
                      <h4>{m.title} <span className="count">{fmtDate(m.at)}</span></h4>
                      {m.entries.map((e) => (
                        <div key={e.id} className={`hist-row ${e.status}`} style={{ ['--c' as string]: ROLES[e.role].color }}>
                          <button onClick={() => setOpen(open === e.id ? null : e.id)}>
                            <Avatar role={e.role} size={22} />
                            <b>{e.name}</b>
                            <span>{ROLES[e.role].label} · {e.task}</span>
                            <em>{e.status === 'done' ? '✓' : e.status === 'failed' ? '✕' : '…'} {e.ms ? fmtDuration(e.ms) : ''}</em>
                          </button>
                          {open === e.id && e.report && <div className="md small" dangerouslySetInnerHTML={{ __html: mdToHtml(tidy(e.report)) }} />}
                        </div>
                      ))}
                    </section>
                  ))}
                </div>
              )
      )}
    </Shell>
  );
}

// ── L'imprimante : les rendus de la mission ──
function FilesRoom() {
  const files = useOffice((s) => s.files);
  const mission = useOffice((s) => s.mission);
  const send = useOffice((s) => s.send);
  const replaying = useOffice((s) => s.replaying);
  if (!mission || !files.length) {
    return <Shell title="결과물" sub="사무실 프린터"><p className="muted">아직 출력된 게 없어요. 팀이 만든 파일이 여기로 와요.</p></Shell>;
  }
  return (
    <Shell title="결과물" sub={`파일 ${files.length}개 · ${mission.title}`}>
      <FileActions files={files} missionId={mission.id} disabled={replaying} send={send} />
    </Shell>
  );
}

export function FileActions({ files, missionId, disabled, send }: { files: ReturnType<typeof useOffice.getState>['files']; missionId: string; disabled: boolean; send: ReturnType<typeof useOffice.getState>['send'] }) {
  const agents = useOffice((s) => s.agents);
  return (
    <div className="files">
      {files.map((f) => (
        <div key={f.path} className="file">
          <span className="file-icon">{fileIcon(f.ext)}</span>
          <div className="file-id">
            <b title={f.path}>{f.name}</b>
            <span className="small muted">{fmtSize(f.size)} · 만든 사람: {f.by === 'chef' ? '강지영' : agents[f.by]?.name ?? '팀'}</span>
          </div>
          {!disabled && (f.ext === 'html' || f.ext === 'htm') && (
            <button className="btn small primary" onClick={() => { sfx('open'); useOffice.setState({ modal: { kind: 'preview', missionId, file: f.path } }); }}>사이트 보기</button>
          )}
          {!disabled && readable(f.ext) && (
            <button className="btn small" onClick={() => { sfx('open'); useOffice.setState({ modal: null, viewer: { missionId, file: f.path } }); send({ t: 'read', missionId, file: f.path }); send({ t: 'versions', missionId, file: f.path }); }}>읽기</button>
          )}
          {!disabled && <button className="btn small ghost" onClick={() => send({ t: 'open', missionId, file: f.path })}>열기</button>}
        </div>
      ))}
    </div>
  );
}

// ── L'aperçu d'un site fait par l'équipe, dans un écran (bac à sable : il ne peut rien toucher) ──
function PreviewRoom({ missionId, file }: { missionId: string; file: string }) {
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop');
  const [nonce, setNonce] = useState(0);
  const send = useOffice((s) => s.send);
  const src = `/apercu/${encodeURIComponent(missionId)}/${file.split('/').map(encodeURIComponent).join('/')}`;
  const close = () => useOffice.setState({ modal: null });
  return (
    <div className="modal-back" onClick={close}>
      <div className="monitor" onClick={(e) => e.stopPropagation()}>
        <div className="monitor-bar">
          <span className="dots"><i /><i /><i /></span>
          <span className="addr">🔒 {file}</span>
          <div className="seg small">
            <button className={device === 'desktop' ? 'on' : ''} onClick={() => setDevice('desktop')}>💻 컴퓨터</button>
            <button className={device === 'phone' ? 'on' : ''} onClick={() => setDevice('phone')}>📱 휴대폰</button>
          </div>
          <button className="btn small" onClick={() => setNonce((n) => n + 1)} title="새로고침">↻</button>
          <button className="btn small" title="페이지 코드와 버전 기록" onClick={() => { useOffice.setState({ modal: null, viewer: { missionId, file } }); send({ t: 'read', missionId, file }); send({ t: 'versions', missionId, file }); }}>&lt;/&gt; 코드와 버전</button>
          <button className="btn small" onClick={() => send({ t: 'open', missionId, file })}>브라우저에서 열기</button>
          <button className="close" onClick={close} aria-label="닫기">×</button>
        </div>
        <div className={`monitor-screen ${device}`}>
          <iframe key={nonce} title={file} src={src} sandbox="allow-scripts allow-forms allow-popups allow-modals" referrerPolicy="no-referrer" />
        </div>
      </div>
    </div>
  );
}
