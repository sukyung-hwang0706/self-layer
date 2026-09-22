<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 작업보고서

- 사용자가 작업을 마친 후 "커밋하면서 작업보고서 생성해줘"와 같이 요청하면, 변경 사항을 확인하고 커밋 전에 `docs/work/YYYY-MM-DD.md`에 한국어 작업보고서를 작성한다.
- 날짜는 Asia/Seoul 기준 작업보고서 작성일을 사용한다.
- 같은 날짜의 보고서가 있으면 기존 내용을 보존하고 이번 작업을 별도 항목으로 추가한다.
- 보고서에는 작업 목적, 주요 변경 사항과 관련 파일, 실제 수행한 검증과 결과, 미완료 사항 및 다음 작업을 기록한다. 수행하지 않은 검증은 수행한 것처럼 기록하지 않는다.
- 보고서를 해당 작업의 커밋에 함께 포함한다. 보고서 자체가 포함될 커밋의 해시는 미리 기록하지 않는다.
- 보고서 형식과 운영 기준은 `docs/work/README.md`를 따른다.
