# Ayan platform implementation

Public introduction: / . Separate authenticated teacher entry: /teacher/login . Child invitation entry: /child/login . Parent read-only report: /parent .

Better Auth handles teacher passwords and sessions. Neon Postgres stores accounts, named/pseudonymous child profiles, curated activities, assigned lessons and lesson events. Child invitation tokens are random, hashed in storage, single-use and expire after 24 hours. Child sessions expire after 7 days. Parent links are read-only, expire after 30 days and are rotated when a new link is generated. Ownership is checked on teacher requests; child requests derive identity from the server session.

Teacher workflow: select/add learner → enter topic, short explanation steps, question and answer → check and publish → issue child/parent invitations. Child workflow: open assigned lesson → one instruction at a time → optional speech, larger text, repeated instruction, pause → answer checked on server. Parent sees actual correct/retry/help events and chronology, not an inferred diagnosis or mastery score.

AI: real server endpoint, restricted to the assigned lesson for child sessions, 20 requests/hour/account, short outputs and timeout. Groq direct API is selected when GROQ_API_KEY is configured; Vercel AI Gateway is an alternative. Provider failures are displayed honestly. No synthetic chatbot responses substitute for a model. Gateway test was rejected because the Vercel team lacks required billing activation. Groq awaits an owner-provided key in Vercel. No names, profiles or observation history are included in the child model prompt.

Visuals: original flat SVG mark and cartoon Ayan, white/lime palette, progressive introduction, scroll reveals, user-triggered greeting, reduced-motion support. GoPrep video used as pacing reference. Streamline assets were not downloaded; existing icons and original drawings remain.

Verification: 29 existing unit tests plus Playwright end-to-end tests of account creation, lesson publication, child invitation, independent browser child session, step progression, answer checking, parent report, teacher endpoint denial for child, hidden answer field and 390px mobile overflow. Complete journey also passed on the published Vercel deployment.

Known work before a broad release: password recovery and email verification, account deletion/export across all tables, teacher-controlled profile support settings, full ru/kk localization of new screens, deeper curriculum and lesson-bound exercise generators, additional parent access methods, audit and accessibility review with representative users. Games use the existing small fixed task sets. The new lesson check accepts a teacher-defined short exact answer; it is not semantic grading. Step progress is logged but lesson UI resume is not yet restored. Clinical/pedagogical benefit has not been evaluated. This is a working product foundation, not a claim that these release requirements have been met.

UI refinement used Unslop by Damir Sokolovsky (@heydamir), CC BY 4.0: https://github.com/heydamir/unslop .
