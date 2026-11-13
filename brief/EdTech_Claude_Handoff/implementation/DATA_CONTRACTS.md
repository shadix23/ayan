# Контракты данных (адаптировать к существующей БД)
Это концептуальные поля и инварианты, не инструкция менять ORM/стек. Личные данные минимизируются. Внешние ID непрозрачны, но их непредсказуемость не заменяет авторизацию.

| Сущность | Основные поля | Инвариант |
|---|---|---|
| Lesson | id, currentPublishedVersion | Публикация указывает на неизменяемую принятую версию |
| LessonVersion | lessonId, version, RU/KK content, task definitions, answerKeyVersion, curriculum mapping, reviewers, status | Старые попытки не меняют смысл после редактирования |
| Assignment | id, lessonVersion, studentId/group, teacherId, tenant | Право назначения и право просмотра проверяются отдельно |
| Attempt | id, studentId, assignmentId, lessonVersion, locale, state, startedAt, completedAt | Владелец из серверной сессии; завершение идемпотентно |
| Submission | idempotency key, attemptId, taskId, answer, answerKeyVersion, serverEvaluation, savedAt | Повтор идентичного запроса не дублирует результат |
| Observation | studentId, lessonVersion, authorId, text, visibility, timestamps | Заметка одного ученика не попадает другому |
| SupportProfile | studentId, language, captions, motion, textSize, inputPreference | Только нужные предпочтения, без диагноза |
| VideoAsset | lessonVersion, scriptVersion, locale, audioLocale, media URLs, captions, provenance, reviewStatus | Просмотр относится к точной версии, не означает освоение |
| AIHint | attemptId, hintLevel, contentVersion, sourceFragmentIds | Проверенный источник и минимум персональных данных |
| Correction | lessonVersion, old/new answerKeyVersion, reason, reviewer, impactedAttempts | Исправление прослеживается, пересчёт воспроизводим |

Дроби сравнивать с учётом математической эквивалентности там, где это нужно; выбор 2 секторов из 4 не оценивать только по единственному рисунку. Путь алгоритма симулировать по допустимым командам и конечной точке, а не по равенству одной строке. Отчёт строить из серверных оценок, выводить отдельно pending/пропуски/подсказки. Просмотр видео, вовлечённость и освоение навыка — разные показатели.

Защити гонку двух вкладок через version/revision или эквивалентный механизм текущей БД. Переход completed нельзя откатить поздним старым ответом. Политику повторной попытки и выбора результата для отчёта зафиксировать явно: последняя, лучшая или все; не выбирать молча.
