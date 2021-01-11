# localization-server

### 프로젝트 APIs

| Action | Method | Rest API | Body Parameter | Response |
| --- | --- | --- | --- | --- |
| 프로젝트 리스트 조회 | GET | /projects |  | {list: [{baseLang: "ko", languages: "ko,ja,en", name: "b2b_access_guide_web", uuid: "dvnad6ov"}]} |
| 프로젝트 생성 | POST | /projects | name: "web_a"<br>languages: "ko,ja,en"<br>base: "ko" | {code: "ok"} |
| 프로젝트 수정 | PUT | /projects/:projectId | languages: "ko,ja,en"<br>base: "ko" | {code: "ok"} |
| 프로젝트 삭제 | DELETE | /projects/:projectId?uuid |  | {code: "ok"} |
| 프로젝트 로그 조회 | GET | /projects/:projectId/logs |  | {code: "ok", result: ["xxxx", "xxxxxx"]} |
| 프로젝트 번역어 전체삭제 | DELETE | /projects/:projectId/translates?uuid |  | {code: "ok"} |
<br>

### 번역리스트 APIs

| Action | Method | Rest API | Body Parameter | Response |
| --- | --- | --- | --- | --- |
| 번역어 생성 | POST | /translates | project: "web_a"<br>uuid: "3f9ck5n9"<br>ko: "한글"<br>ja: "言語"<br>en: "english" | {code: "ok", data: {strid: "3f9ck5n9_00001", uid: "3f9ck5n9_00001", ko: "한글", ja: "言語", en: "english"}}} |
| 번역어 수정 | PUT | /translates/:translateId | project: "web_a"<br>strid: "3f9ck5n9_00001"<br>ko: "한글"<br>ja: "言語"<br>en: "english" | {code: "ok", data: {id: "3f9ck5n9_00001", locale: {strid: "3f9ck5n9_00001", ko: "한글", ja: "言語", en: "english"}}} |
| 번역어 삭제 | DELETE | /translates/:translateId?project |  | {code: "ok"} |
| 번역어리스트 다운로드 | GET | /translates/file?projectName&lang&type |  | file |
| 번역업로드용 Excel 샘플파일 다운로드 | GET | /translates/sampleFile |  | file |
| 번역어 검색 | GET | /translates/search?search |  | {code: "ok", result: [{base: "HH:mm:ss", ja: "HH:mm:ss", ko: "HH:mm:ss", projectLanguages: "ko,ja,en", projectName: "module_web", projectUuid: "75xfq4bx", strid: "CAMERA_DETAIL_EVENT_TIME_FORMAT", uid: "75xfq4bx_00014"}]} |
<br>

### 번역리스트(App빌드용) APIs

| Action | Method | Rest API | Body Parameter | Response |
| --- | --- | --- | --- | --- |
| 번역어 리스트 조회 | GET | /translateList?projectName&updateDate |  | {code: "ok", updateDate: 1599994475106, tags: []} |
| 번역어 생성 | POST | /translateList | projectName: "web_a"<br>locale: "ja"<br>itemMap: {"STR_NO_REGIST_CAM" : "カメラ登録に失敗しました。"} | {code: "ok"} |
| 번역어 삭제 | DELETE | /translateList | projectName: "web_a<br>keys: ["STR_NO_REGIST_CAM"] | {code: "ok"} |
<br>

### User 인증 APIs

| Action | Method | Rest API | Body Parameter | Response |
| --- | --- | --- | --- | --- |
| 회원가입 | POST | /users/signup | id: "ID"<br>password: "1234" | {code: "ok"} |
| 로그인 | POST | /users/login | id: "ID"<br>password: "1234" | { code: 'ok', user: {id: "ID", admin: false}, token: "xxxx" } |
| 내정보조회 | GET | /users/me |  | {code: "ok", user: {id: "ID", admin: false}} |

