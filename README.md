# 에이전트 사무실 (한국어판)

**원하는 걸 말하면, AI 에이전트 팀이 눈앞에서 일을 시작해요.**

에이전트 사무실은 Claude Code를 작은 픽셀 아트 게임으로 바꿔 줘요. 팀장 **관우**가 요청을 읽고 알맞은 팀원을 불러요.
팀원들은 문으로 들어와 자기 자리에 앉고, 말풍선에는 지금 이 순간 실제로 하고 있는 일이 나와요.
애니메이션이 아니에요. 로봇 하나하나가 진짜 Claude Code 에이전트이고, 내 컴퓨터에서 내 구독으로 일해요.

> 이 저장소는 **[Le Bureau des agents](https://github.com/devlikemasta/bureau-des-agents)**
> ([VibesMoney](https://vibesmoney.com), MIT 라이선스)를 한국어로 옮기고 몇 가지 기능을 더한 포크예요.
> 사무실의 설계, 픽셀 아트, 코드의 대부분은 원작자의 작업이에요. 원작 README는 [README.fr.md](README.fr.md)에 그대로 있어요.

![원작 화면: 팀이 일하는 모습](docs/bureau-en-mission.gif)

*(위 이미지는 원작 프랑스어판 화면이에요.)*

---

## 원작과 달라진 점

- **화면 전체 한국어화**: 메뉴, 창, 안내문, 오류 메시지, 미션 아이디어, 사무실 투어까지 모두 한국어예요.
- **에이전트도 한국어로 일해요**: 팀장과 팀원 지시문을 한국어로 바꿔서 계획, 보고서, 결과물이 한국어로 나와요.
- **한글 픽셀 표지판**: 리서치·코드·디자인·글쓰기·분석·검수·팀장, 보드의 「작전」을 7×10 픽셀 한글로 직접 그렸어요.
- **팀장 이름과 목소리**: 팀장 이름은 관우이고, 한국어 목소리와 자막이 나와요. 음성 입력(🎙️)도 한국어로 알아들어요.
- **내 프로젝트에서 미션 시작**: 입력창 위 「내 프로젝트 고르기」로 이미 만들고 있는 폴더를 고르면, 팀이 그 폴더 안에서 일해요.
  팀은 여전히 그 폴더 밖으로 나갈 수 없어요.
- **검수 팀원 추가**: 결과물 파일을 만든 미션은 끝내기 전에 검수자가 확인해요. 요청 항목을 빠짐없이 했는지, 출처와 숫자가 맞는지,
  코드가 실제로 작동하는지 검사하고 「통과/수정 필요」 판정과 문제 목록을 돌려줘요. 검수자는 파일을 고치지 않고, 고치는 건 팀장이 해요.

## 설치하기

필요한 것:
- [Claude Code](https://claude.com/claude-code) **2.1.312 이상**, 로그인된 상태 (`claude update`, `claude auth login`)
- [Node.js](https://nodejs.org) **22.18 이상**

```bash
git clone https://github.com/wonhyunroh/bureau-des-agents.git
cd bureau-des-agents
npm install
npm start
```

브라우저가 http://localhost:4848 으로 열려요. 끄려면 터미널에서 `Ctrl + C`를 누르세요.

> **Claude Code에게 맡기기**: Claude Code를 열고 「에이전트 사무실 설치하고 실행해 줘: https://github.com/wonhyunroh/bureau-des-agents」라고 말해도 돼요.
> Claude Code는 Node 버전을 확인하고, 저장소를 받아 `npm install` 후 `npm start`를 **백그라운드로** 실행하면 돼요.

## 첫 미션

1. 오른쪽 패널의 **「사무실 규칙」**에 나와 내 일을 적어 두세요. 팀장이 미션마다 먼저 읽어요.
2. 입력창에 원하는 걸 적고 **시작하기**를 누르세요. 키보드나 음성(🎙️) 둘 다 돼요.
   - 「경쟁사 5곳을 분석하고 가격을 비교해 줘」
   - 「이번 주 AI 소식 중 사업하는 사람에게 중요한 5가지를 정리해 줘」
   - 「내 사업에 대한 링크드인 글 3개 써 줘」
3. 내 프로젝트에서 일을 시키려면 입력창 위 **「내 프로젝트 고르기」**로 폴더를 고르세요.
   팀이 실제 파일을 고치니까, 시작하기 전에 git 커밋으로 백업해 두면 안전해요.

### 단축키

| 키 | 기능 |
|---|---|
| `T` | 사무실 투어 (팀장 목소리와 자막) |
| `F` | 촬영 모드: 카메라가 알아서 움직임을 따라가요 (`F`나 `Esc`로 끝내기) |
| `V` | 세로 화면 9:16 (릴스·쇼츠용) |
| `C` | 자동 카메라 켜기/끄기 |
| `N` | 낮 / 저녁 / 밤 |
| `J` | 주크박스 |
| `M` | 소리 켜기/끄기 |
| 마우스 휠 | 확대 (더블클릭하면 전체 화면) |

## 내 컴퓨터에서 일어나는 일

- **모든 게 내 컴퓨터 안에서 돌아가요.** 사무실은 내 컴퓨터(127.0.0.1)에서만 접속을 받아요.
- **팀장은 진짜 Claude Code 세션**이에요. 팀원들은 진짜 Claude Code 서브에이전트이고, 각자 자기 일에 필요한 도구만 써요.
- **팀은 작업 폴더 밖으로 못 나가요** (`--restricted` 모드). 미션 폴더는 기본적으로 `~/Documents/Bureau des agents/Missions/`에 만들어져요.
- **위험한 작업은 먼저 물어봐요.** 민감한 명령을 실행하기 전에 에이전트가 손을 들고, 예/아니요로 답하면 돼요.
- **내 Claude 구독 사용량을 써요.** 직접 Claude Code에게 일을 시키는 것과 같아요.

## 출처와 고마운 분들

- **원작**: [Le Bureau des agents](https://github.com/devlikemasta/bureau-des-agents) by [VibesMoney](https://vibesmoney.com) (MIT).
  원작은 [Pixel Agents](https://github.com/pablodelucca/pixel-agents)와 [claude-office](https://github.com/paulrobello/claude-office)에서 영감을 받았어요.
- **한국어 목소리**: [ElevenLabs](https://elevenlabs.io) 목소리 라이브러리의 「Jisoo」로 만든 녹음이에요 (`public/voice/ko/`).
- **원작 프랑스어 목소리와 음악**: 원작에 포함된 파일 그대로예요. 음악은 원작자가 [ElevenLabs Music](https://elevenlabs.io/music)과 Google Lyria로
  작곡했고, 원작 목소리는 ElevenLabs의 「Léo」예요.
- **효과음**: [ZzFX](https://github.com/KilledByAPixel/ZzFX) (MIT). **글꼴**: Pixelify Sans, Plus Jakarta Sans (OFL).

## 라이선스

MIT 라이선스예요 ([LICENSE](LICENSE)). 원작자의 저작권 표시를 그대로 유지하고, 한국어판에서 바꾼 부분의 저작권 줄을 더했어요.
