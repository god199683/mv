# 여우빛 Grok 영상 작업실

GitHub Pages용 정적 작업실입니다. 이미지 없이도 Grok가 MV 주인공과 세 구미호 팀을 새로 구성하며, 이미지가 첨부되면 그 외형을 우선 반영합니다.

## GitHub Pages + Supabase 설정

1. Supabase Authentication의 Redirect URL에 `https://god199683.github.io/mv/`를 추가합니다.
2. `supabase/functions/grok-video/index.ts`를 `grok-video` Edge Function으로 배포하고 JWT 검증을 켭니다.
3. Edge Function Secrets에 `XAI_API_KEY`를 설정합니다. 이 키는 GitHub나 브라우저에 넣지 않습니다.
4. `main`에 푸시한 뒤 GitHub Settings → Pages의 Source를 **GitHub Actions**로 선택합니다.

이 대시보드는 xAI Grok Video API로 클립을 생성하고, 완료된 MP4를 각 작업실의 `output` 폴더에 자동 보관합니다. API 키는 브라우저에 저장하거나 전송하지 않으며, 로컬 서버의 환경 변수에서만 읽습니다.

## 실행

PowerShell에서 아래처럼 실행합니다. xAI Console에서 발급한 API 키를 본인 키로 바꾸세요.

```powershell
$env:XAI_API_KEY = "본인의_xAI_API_키"
node server.js
```

그 뒤 브라우저에서 `http://127.0.0.1:3030`을 엽니다.

## 사용 방식

- MV 작업실: 캐릭터 시트를 첨부하고 장면 프롬프트로 1–15초 클립을 만듭니다.
- 세 구미호 작업실: 세 캐릭터 이미지를 참조 이미지로 첨부해 1–15초 클립을 만듭니다.
- 약 1분 영상은 4–8개 클립을 생성한 뒤 편집 프로그램에서 이어 붙입니다. xAI Video API의 한 요청은 최대 15초입니다.

`grok-imagine-video-1.5`는 생성 길이와 해상도에 따라 비용이 청구됩니다. 생성 전 대시보드에서 길이와 해상도를 확인하세요.
