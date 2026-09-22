# 문항 데이터

원본은 `../project_sources/SELF_LAYERS_108문항_검사로직_FINAL_v1.0.xlsx`입니다. 변환 스크립트는 원본을 읽기 전용으로 엽니다.

- `src/data/questions.json`: 문항은행의 최종 문구·역채점·역할과 서비스 노출순서를 ID로 연결한 108문항입니다. `displayOrder` 순으로 저장하며, ID 끝 번호를 화면 순서로 사용하지 않습니다.
- `src/data/dimensions.json`: 차원 설계 시트의 27개 차원입니다. `area`, `code`, `name`, `definition`, `boundary`를 보존합니다.
- `src/types/survey.ts`: 문항·차원·응답의 TypeScript 타입입니다.
- `reverse`는 원본 Y를 `true`, N을 `false`로 변환합니다. 문구 의미를 추정해 변경하지 않습니다. 원본의 역채점 검토 후보도 그대로 보존했으므로 채점 규칙 확정과는 구분해야 합니다.
- `weight`는 채점 로직 시트의 현재 공통 가중치 1.0입니다.
- 내부 차원 코드는 식별용이며, 사용자 화면에는 차원명을 사용합니다.

## 실행

Python 3.10 이상이 필요하며 추가 Python 패키지는 필요하지 않습니다. `my-app`에서 실행합니다.

```powershell
npm.cmd run data:generate
npm.cmd run data:validate
```

생성 명령은 JSON 두 파일을 갱신한 뒤 검증합니다. 검증 명령은 파일을 수정하지 않습니다. 원본 엑셀도 함께 있어야 원본 대조 검증을 실행할 수 있습니다.

검증 항목은 정확히 108문항, ID 중복, 순서 1~108, 27차원과 차원당 4문항, 영역별 개수, 필드와 값의 형식, 차원 참조, 두 원본 문항 시트 간 일치, 모든 출력 필드의 원본 일치, 역채점 보존, 가중치, 실행 전후 원본 SHA256입니다. 실패하면 종료 코드 1을 반환합니다.
