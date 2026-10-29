// Qu'y a-t-il sous la souris ? Un robot, le chat, un meuble, le tableau, l'horloge… Le plus en avant gagne.
import { ROLES } from '../../shared/activity.ts';
import type { Role } from '../../shared/protocol.ts';
import { textHeight, textWidth } from './font.ts';
import { SIGN as ZONE_SIGN } from './room.ts';
import { furniturePlacement } from './furniture.ts';
import { BOARD, CLOCK, DOOR, FURNITURE, NEON, POSTER, T, WINDOWS, ZONES } from './layout.ts';
import type { World } from './world.ts';

export type Hit =
  | { kind: 'actor'; id: string; label: string }
  | { kind: 'cat'; label: string }
  | { kind: 'object'; id: string; label: string; role?: Role };


function furnitureLabel(id: string, kind: string, role?: Role): string {
  switch (kind) {
    case 'desk': return `${ROLES[role ?? 'renfort'].label} 코너의 책상`;
    case 'chair': return `${ROLES[role ?? 'renfort'].label} 코너의 자리`;
    case 'chefDesk': return '관우의 책상: 팀의 보고서';
    case 'chefChair': return '관우의 의자';
    case 'rack': return '서버: Claude Code와 구독';
    case 'printer': return '프린터: 미션 결과물';
    case 'cooler': return '정수기';
    case 'easel': return '디자인 스튜디오의 이젤';
    case 'plantBig': case 'plantTall': case 'plantSmall': return '화분 (간질이면 좋아해요)';
    case 'sofa': return '소파 (고양이가 제일 좋아하는 자리)';
    case 'tableLow': return '낮은 테이블';
    case 'lamp': return '스탠드 조명 (클릭하면 꺼져요)';
    case 'shelf': return '기록 보관함: 지난 미션';
    case 'coffee': return '커피 머신';
    case 'bin': return '휴지통';
    case 'jukebox': return '주크박스';
  }
  return id;
}

const placed = FURNITURE.map((f) => {
  const p = furniturePlacement(f);
  return { f, x: p.x, y: p.y, w: p.s.c.width, h: p.s.c.height, sortY: p.sortY };
}).sort((a, b) => b.sortY - a.sortY);

const inRect = (x: number, y: number, r: { x: number; y: number; w: number; h: number }) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

export function hitAt(world: World, x: number, y: number): Hit | null {
  // les robots (le plus en avant d'abord)
  const actors = [...world.actors.values()].sort((a, b) => (b.seated && b.seat ? b.seat.y : b.y) - (a.seated && a.seat ? a.seat.y : a.y));
  for (const a of actors) {
    const ay = a.seated && a.seat ? a.seat.y : a.y;
    if (a.alpha > 0.3 && x >= a.x - 7 && x <= a.x + 7 && y >= ay - 21 && y <= ay + 1) {
      return { kind: 'actor', id: a.id, label: a.id === 'chef' ? '관우, 팀장' : `${a.name} · ${ROLES[a.role].label}` };
    }
  }
  if (world.cat.hit(x, y)) return { kind: 'cat', label: 'Pixel, 사무실 고양이' };
  // les meubles
  for (const p of placed) {
    if (!inRect(x, y, { x: p.x + 1, y: p.y + 1, w: p.w - 2, h: p.h - 2 })) continue;
    // un pixel transparent du dessin ne compte pas : on regarde le meuble suivant
    return { kind: 'object', id: p.f.id, label: furnitureLabel(p.f.id, p.f.kind, p.f.role), role: p.f.role };
  }
  // le mur du fond et le sol
  if (inRect(x, y, { x: BOARD.x - 2, y: BOARD.y - 2, w: BOARD.w + 4, h: BOARD.h + 6 })) return { kind: 'object', id: 'board', label: '보드: 관우의 계획' };
  if (inRect(x, y, { x: CLOCK.x - 1, y: CLOCK.y - 1, w: 16, h: 16 })) return { kind: 'object', id: 'clock', label: '시계' };
  if (inRect(x, y, { x: NEON.x, y: NEON.y - 3, w: 26, h: 26 })) return { kind: 'object', id: 'neon', label: 'VibesMoney 네온사인 (클릭하면 색이 바뀌어요)' };
  if (inRect(x, y, POSTER)) return { kind: 'object', id: 'poster', label: '목표 포스터' };
  for (const w of WINDOWS) if (inRect(x, y, { x: w.x - 3, y: w.y - 3, w: w.w + 6, h: w.h + 8 })) return { kind: 'object', id: 'window', label: '창문 (낮, 저녁, 밤)' };
  if (inRect(x, y, DOOR)) return { kind: 'object', id: 'door', label: '문: 팀이 이리로 들어와요' };
  for (const z of ZONES) {
    const text = ZONE_SIGN[z.role] ?? z.label;
    const w = textWidth(text) + 10, h = textHeight(text) + 4;
    const sx = z.x * T + 4, sy = z.role === 'chef' ? (z.y + z.h) * T - h - 3 : z.y * T + 3;
    if (inRect(x, y, { x: sx, y: sy, w, h })) return { kind: 'object', id: `zone:${z.role}`, label: `${ROLES[z.role].label} 코너: 누가 어떤 도구로 일하는지`, role: z.role };
  }
  return null;
}
