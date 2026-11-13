# Этап 0: аудит Ayan

Дата: 13.11.2026. Задание: `brief/EdTech_Claude_Handoff/` (пакет Codex). Проверка проводилась на локальном сервере (`PORT=4183 node server.mjs`, база SQLite `.data/ayan.sqlite` с тестовыми данными). Рабочая база Neon не использовалась.

## Фактический стек

| Часть | Что есть |
|---|---|
| Сервер | Один файл `server.mjs` на `node:http`, Node 24. На Vercel тот же обработчик через `api/index.mjs` |
| База | Локально SQLite (`node:sqlite`), в проде Postgres (Neon) через `pg`. Схема создаётся `CREATE TABLE IF NOT EXISTS` при старте |
| Авторизация | Учитель: Better Auth (почта и пароль, cookie-сессия, rate limit в базе). Ребёнок: одноразовый код от учителя, затем cookie `ayan_child` (HttpOnly, SameSite=Strict, 7 дней), в базе хранится sha256 токена. Родитель: ссылка с кодом, 30 дней, только чтение |
| Роли | teacher, child, parent по ссылке. Организаций (tenant) и админа нет |
| Защита от CSRF | Для всех не-GET запросов, кроме `/api/auth/*`, требуется `Origin` равный адресу сайта; cookie SameSite=Strict |
| Клиент | Статический `dist/`, чистый JS без сборки. `account-boot.js` грузит скрипты, `app.js` (кабинет учителя), `experience.js` (мир ребёнка), `product.js` (урок и панель учителя) |
| 3D | Three.js r180 (vendored), GLTFLoader, `mascot3d.mjs` |
| Тесты | `node --test tests/*.test.cjs` (юнит), e2e на Playwright: `tests/demo-e2e.cjs`, `tests/platform-e2e.cjs` |
| Деплой | Vercel, push в `main` выкладывает сайт |

## Данные

| Таблица | Содержимое | Замечание |
|---|---|---|
| `ayan_children` | id, owner (учитель), label, state (JSON игр) | Владение проверяется по owner |
| `ayan_lessons` | child (PK), content (JSON урока) | Один урок на ребёнка, перезаписывается |
| `ayan_events` | child, lesson (название!), kind, value, created | Источник истины прогресса и отчёта родителю |
| `ayan_teacher_state` | owner, state (JSON кабинета, включая наблюдения) | Наблюдения не привязаны к ученику |
| `ayan_invites`, `ayan_child_sessions`, `ayan_parent_links` | хеши токенов и сроки | |

## Путь урока (прослежен по коду и запросами)

1. Учитель: `POST /api/lesson?role=teacher&child=ID` (`server.mjs`, обработчик `/api/lesson`) проверяет владельца и перезаписывает `ayan_lessons.content`.
2. Ребёнок: `GET /api/lesson?role=child` отдаёт урок без ответа.
3. Шаги, подсказки, пауза, ответ: `POST /api/lesson/event`. Ответ сравнивается с текущим ключом урока, результат пишется строкой `correct` или `retry`.
4. Отчёт родителю: `POST /api/parent/report` считает события по типам.

## Подтверждённые проблемы

Воспроизведение: `node tests/audit-repro.mjs` против локального сервера (вывод ниже).

| № | Проблема | Где | Как воспроизвести | Важность |
|---|---|---|---|---|
| A1 | Повтор отправки (двойной клик, повтор после таймаута) создаёт второй ответ, отчёт завышается | `server.mjs`, `/api/lesson/event` | два одновременных `kind:answer value:5` → в отчёте 2 верных ответа | высокая |
| A2 | Пустой ответ сохраняется как неверный | там же | `value:"   "` → HTTP 200, `retry` | средняя |
| A3 | Нет версий урока: после смены ключа старые ответы остаются под тем же уроком, отчёт смешивает версии | `/api/lesson` (перезапись), события хранят только название | опубликовать урок с ключом 5, ответить, переопубликовать с ключом 7 | высокая |
| A4 | Завершение игр задаёт клиент: ребёнок может отметить все 9 игр пройденными | `/api/state?role=child` | `PUT completed=[все]` → в отчёте 9 игр | средняя |
| A5 | Значение шага не проверяется | `/api/lesson/event` | `step value:"<b>999</b>"` → 200 (вывод через textContent, XSS не найден) | низкая |
| A6 | Учитель не может закрыть доступ ребёнку: нет отзыва сессии | нет эндпоинта | `DELETE /api/children` → 404, сессия ребёнка продолжает работать | средняя |
| A10 | У ответа нет attemptId/submissionId, сервер не отличает повтор от нового ответа | `/api/lesson/event` | см. A1 | высокая |
| A11 | Ложное «неверно» при сбое сети: ошибка сохранения показывается как «Попробуем ещё раз» | `dist/product.js:103` (`event()` глотает ошибку) и `:143` (отсутствие результата = неверно) | отключить сеть и отправить ответ: ребёнок видит «Попробуем ещё раз» | высокая |
| A12 | Наблюдения учителя не привязаны к ученику: при нескольких учениках сводка и список общие | `dist/app.js:350` (объект без studentId), хранение в `ayan_teacher_state` | добавить второго ученика, переключиться: те же наблюдения | высокая |

## Не подтвердилось

| № | Проверка | Результат |
|---|---|---|
| A7 | Обход доступа подменой `role` (заявленная проблема N1) | Был, исправлен утром 13.11 в коммите 54cad12. Сейчас другой учитель с `role=admin`/`role=x` получает 404 |
| A8 | Анонимный доступ к урокам, состоянию, списку учеников, отчёту | Везде 401 |
| A9 | Старая ссылка родителя после выдачи новой | 401, отзывается |

## Гипотезы, которые не проверялись

- Кеширование личных ответов: ответы API идут с `Cache-Control: no-store`; поведение кнопки «Назад» браузера после выхода вручную не проверялось.
- Нагрузка и перебор кодов: коды 18-24 случайных байта, перебор нереален; отдельного лимита на `/api/child/enter` нет.
- Мобильная производительность 3D не измерялась на реальном телефоне.

## Инструменты

| Инструмент | Версия | Проверка | Ограничение |
|---|---|---|---|
| Three.js | r180 | `dist/vendor/three.core.js` (REVISION) | - |
| Blender | 5.3.0 | `/Applications/Blender.app/Contents/MacOS/Blender --version`; управление через MCP Blender | GUI-сессия пользователя |
| glTF-экспортёр | io_scene_gltf2 5.3.43 | addons_core в Blender | Draco есть, но в проекте нет DRACOLoader |
| VideoCraft | не найден | `ls ~/.claude/skills` | Установлен другой skill: `video-shotcraft` (Remotion, продуктовые ролики). Использовать как «VideoCraft» нельзя; для учебного ролика нужен свой состав на Remotion или рендер Blender |
| Remotion | 4.0.484 (в `ClaudeProject/promo`) | `package.json` | `node_modules` не установлены; ставится `npm install` |
| ffmpeg | нет | `which ffmpeg` | Remotion приносит свой; отдельный ffmpeg не установлен |
| ElevenLabs | коннектор Claude (ограниченный) | `creative_list_voices`, `creative_generate_speech` | Платные символы: генерация только с разрешения владельца |
| Playwright | 1.56.1 во временной папке | `PLAYWRIGHT_PATH=... node tests/demo-e2e.cjs` | В репозитории не установлен, путь задаётся переменной |

## Вывод аудита (13.11.2026, до исправлений)

```
CONFIRMED       A1 duplicate submit: one answer sent twice (double click) -> parent report shows 2 correct answers
CONFIRMED       A2 empty answer = wrong: blank answer -> HTTP 200, stored value "retry"
CONFIRMED       A3 no lesson version: after changing the answer key from 5 to 7, old "correct" answers stay under the same lesson "Тема аудита" with no version
CONFIRMED       A4 trusted game completion: child PUT completed=all -> HTTP 200, parent report lists 9 completed games
CONFIRMED       A5 unvalidated step value: step value "<b>999</b>" -> HTTP 200 (stored as text; output uses textContent, so no XSS seen)
CONFIRMED       A6 no access revocation: DELETE /api/children -> HTTP 404; child session still reads the lesson (HTTP 200)
NOT REPRODUCED  A7 role spoofing (regression): other teacher with role=admin/x -> lesson HTTP 404, state HTTP 404
NOT REPRODUCED  A8 anonymous access: anonymous lesson/state/children/report -> 401, 401, 401, 401
NOT REPRODUCED  A9 parent link not revoked: old parent code after re-issue -> HTTP 401
CONFIRMED       A10 no attempt id: POST /api/lesson/event {kind:"answer"} takes only value; server cannot deduplicate a retry (see A1)
```
