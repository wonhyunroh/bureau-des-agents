// Les métiers du bureau, et la traduction en français de ce que fait vraiment chaque agent :
// chaque outil de Claude Code devient une action (une icône, une animation, une bulle).
import type { ActKind, MissionStats, OfficeEvent, Role } from './protocol.ts';

export interface RoleInfo {
  /** le nom du métier, tel qu'il s'affiche dans le bureau */
  label: string;
  icon: string;
  color: string;
  /** l'agent Claude Code (subagent_type) qui fait ce métier */
  type: string;
  what: string;
}

export const ROLES: Record<Role, RoleInfo> = {
  chef: { label: '팀장', icon: '⭐', color: '#FF8A3D', type: '', what: '요청을 받아 계획을 세우고, 일을 나누고, 결과물을 합쳐요.' },
  recherche: { label: '리서치', icon: '🔎', color: '#4FB3FF', type: 'chercheur', what: '인터넷에서 조사해요: 경쟁사, 가격, 리뷰, 뉴스, 출처.' },
  code: { label: '코드', icon: '💻', color: '#3DDC97', type: 'developpeur', what: '코드, 웹사이트, 스크립트, 자동화: 실행하고 테스트하는 모든 것.' },
  design: { label: '디자인', icon: '🎨', color: '#FF6FA8', type: 'designer', what: '완성도 높은 웹 페이지, 시안, 비주얼, 꾸미기.' },
  redaction: { label: '글쓰기', icon: '✍️', color: '#A98BFF', type: 'redacteur', what: 'SNS 게시물, 이메일, 기사, 영상 대본, 보고서.' },
  analyse: { label: '분석', icon: '📊', color: '#FFC93D', type: 'analyste', what: '숫자, 표, 파일, 비교, 계산.' },
  renfort: { label: '지원', icon: '🤖', color: '#9AA3B5', type: '', what: '따로 떨어진 작업을 도와줘요.' },
};

/** Les outils Claude Code de chaque métier (le chef a tous ceux de la séance). */
export const ROLE_TOOLS: Record<Role, string[]> = {
  chef: ['Agent', 'TodoWrite', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Bash'],
  recherche: ['WebSearch', 'WebFetch', 'Read', 'Glob', 'Grep'],
  code: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'WebFetch'],
  design: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebFetch'],
  redaction: ['Read', 'Write', 'Edit', 'Glob', 'Grep'],
  analyse: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  renfort: [],
};

/** Ce que veut dire chaque outil, en français (pour la fiche des métiers). */
export const TOOL_INFO: Record<string, string> = {
  Agent: '팀원을 불러요', TodoWrite: '계획을 쓰고 체크해요', Read: '파일을 읽어요', Write: '파일을 만들어요',
  Edit: '파일을 고쳐요', Glob: '파일을 찾아요', Grep: '파일 안에서 찾아요', WebSearch: '인터넷에서 검색해요',
  WebFetch: '웹 페이지를 읽어요', Bash: '명령어를 실행해요',
};

/** Le métier d'un agent, d'après le type d'agent que le chef a appelé. */
export function roleOfType(type: string): Role {
  for (const [role, info] of Object.entries(ROLES) as [Role, RoleInfo][]) if (info.type && info.type === type) return role;
  return 'renfort';
}

/** Les prénoms des robots, par métier (jamais deux fois le même dans une mission). */
export const NAMES: Record<Role, string[]> = {
  chef: ['강지영'],
  recherche: ['Iris', 'Hugo', 'Léa', 'Malo', 'Zoé', 'Noé', 'Inès', 'Tom', 'Jade', 'Sacha', 'Lou', 'Nils'],
  code: ['Ada', 'Linus', 'Grace', 'Alan', 'Margaret', 'Dennis'],
  design: ['Frida', 'Coco', 'Henri', 'Sonia', 'Saul'],
  redaction: ['Colette', 'Victor', 'Simone', 'Jules', 'George'],
  analyse: ['Marie', 'Blaise', 'Émilie', 'Gaspard', 'Ada'],
  renfort: ['Bob', 'Lulu', 'Gaston', 'Nina', 'Momo', 'Kiki'],
};

const base = (p: unknown) => (typeof p === 'string' ? p.split(/[\\/]/).filter(Boolean).pop() ?? p : '');
export const cut = (s: unknown, n = 60) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};
export const host = (u: unknown) => {
  try { return new URL(String(u)).hostname.replace(/^www\./, ''); } catch { return cut(u, 40); }
};

const MCP_NAMES: Record<string, string> = {
  gmail: 'Gmail', google_drive: 'Google Drive', notion: 'Notion', google_calendar: 'Google 캘린더', calendar: 'Google 캘린더',
  slack: 'Slack', github: 'GitHub', stripe: 'Stripe', hubspot: 'HubSpot', airtable: 'Airtable',
};

/** Le nom lisible d'un connecteur MCP : mcp__claude_ai_Gmail__search_threads → Gmail */
export function mcpName(tool: string): { server: string; action: string } {
  const parts = tool.split('__');
  const raw = (parts[1] ?? '').replace(/^claude_ai_/, '').replace(/^plugin_[^_]+_/, '');
  const server = MCP_NAMES[raw.toLowerCase()] ?? raw.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return { server, action: (parts[2] ?? '').replace(/[_-]+/g, ' ') };
}

/** L'action, sa phrase (courte, pour la bulle) et le détail complet (pour le panneau). */
export function describeAct(tool: string, input: Record<string, unknown> | undefined): { kind: ActKind; label: string; detail: string } {
  const i = input ?? {};
  switch (tool) {
    case 'WebSearch': return { kind: 'search', label: `「${cut(i.query, 44)}」 검색 중`, detail: String(i.query ?? '') };
    case 'WebFetch': return { kind: 'web', label: `${host(i.url)} 읽는 중`, detail: String(i.url ?? '') };
    case 'Read': return { kind: 'read', label: `${cut(base(i.file_path), 36)} 읽는 중`, detail: String(i.file_path ?? '') };
    case 'Glob': return { kind: 'read', label: '폴더 살펴보는 중', detail: String(i.pattern ?? '') };
    case 'Grep': return { kind: 'read', label: `「${cut(i.pattern, 30)}」 찾는 중`, detail: `${i.pattern ?? ''}${i.path ? ' (' + i.path + ')' : ''}` };
    case 'LS': return { kind: 'read', label: '폴더 보는 중', detail: String(i.path ?? '') };
    case 'Write': return { kind: 'write', label: `${cut(base(i.file_path), 36)} 작성 중`, detail: String(i.file_path ?? '') };
    case 'Edit':
    case 'MultiEdit': return { kind: 'edit', label: `${cut(base(i.file_path), 34)} 수정 중`, detail: String(i.file_path ?? '') };
    case 'NotebookEdit': return { kind: 'edit', label: `${cut(base(i.notebook_path), 34)} 수정 중`, detail: String(i.notebook_path ?? '') };
    case 'Bash': {
      const c = String(i.command ?? '').replace(/\s+/g, ' ').trim();
      return { kind: 'bash', label: `${c.length <= 34 ? `「${c}」` : cut(i.description || c, 40)} 실행 중`, detail: String(i.command ?? '') };
    }
    case 'TodoWrite': return { kind: 'plan', label: '계획 업데이트 중', detail: '' };
    case 'Skill': return { kind: 'skill', label: `${cut(i.skill ?? i.name, 24)} 스킬 사용 중`, detail: String(i.args ?? '') };
    case 'ToolSearch': return { kind: 'other', label: '알맞은 도구 찾는 중', detail: String(i.query ?? '') };
  }
  if (tool.startsWith('mcp__')) {
    const { server, action } = mcpName(tool);
    return { kind: 'mcp', label: `${server} 사용 중`, detail: action };
  }
  return { kind: 'other', label: `${tool} 사용 중`, detail: '' };
}

export const emptyStats = (): MissionStats => ({ agents: 0, searches: 0, pages: 0, reads: 0, writes: 0, commands: 0 });

/** Les compteurs de la mission (recherches, pages lues…), mis à jour événement par événement. */
export function countStats(s: MissionStats, ev: OfficeEvent) {
  if (ev.k === 'hire') s.agents++;
  if (ev.k !== 'act') return;
  if (ev.kind === 'search') s.searches++;
  else if (ev.kind === 'web') s.pages++;
  else if (ev.kind === 'read') s.reads++;
  else if (ev.kind === 'write' || ev.kind === 'edit') s.writes++;
  else if (ev.kind === 'bash') s.commands++;
}

/** Remplace le chemin du dossier de la mission par « . » partout où il apparaît en entier. */
export function relToFolder(text: string, folder: string): string {
  if (!folder) return text;
  const esc = folder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(esc + '(?=$|[/"\'\\s])', 'g'), '.').replace(/(^|[\s"'])\.\//g, '$1');
}

/** La commande telle qu'elle sera lancée, juste rendue lisible (le dossier de la mission devient « . »). Rien n'est caché. */
export function readableCommand(cmd: unknown, folder: string): string {
  return relToFolder(String(cmd ?? ''), folder).trim().replace(/^cd\s+(?:"\."|'\.'|\.)\s*&&\s*/, '');
}

const FULL_MAX = 72;

/**
 * La demande de permission : la phrase de la bulle, le détail complet, et `full`
 * (vrai seulement si la bulle montre toute l'action : on peut alors répondre directement dans la bulle).
 */
export function permissionText(tool: string, input: Record<string, unknown> | undefined, folder: string): { label: string; detail: string; full: boolean } {
  const i = input ?? {};
  if (tool === 'Bash') {
    const c = readableCommand(i.command, folder);
    const full = c.length > 0 && c.length <= FULL_MAX && !c.includes('\n');
    return { label: `「${full ? c : cut(c, 48)}」 실행해도 될까요?`, detail: c, full };
  }
  if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit' || tool === 'NotebookEdit') {
    const raw = String(i.file_path ?? i.notebook_path ?? '');
    const rel = relToFolder(raw, folder);
    const inside = !!folder && raw.startsWith(folder + '/') && !rel.includes('..');
    return { label: `${inside ? rel : raw} ${tool === 'Write' ? '작성해도' : '수정해도'} 될까요?`, detail: raw, full: inside && rel.length <= FULL_MAX };
  }
  if (tool === 'WebFetch') return { label: `${host(i.url)} 읽어도 될까요?`, detail: String(i.url ?? ''), full: false };
  const detail = relToFolder(JSON.stringify(i, null, 2), folder);
  const clipped = detail.length > 1500 ? detail.slice(0, 1499) + '…' : detail;
  if (tool.startsWith('mcp__')) {
    const { server, action } = mcpName(tool);
    return { label: `${server} 사용해도 될까요? (${action})`, detail: clipped, full: false };
  }
  return { label: `${tool} 사용해도 될까요?`, detail: clipped, full: false };
}
