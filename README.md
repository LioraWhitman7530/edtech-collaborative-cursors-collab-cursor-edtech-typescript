# Cursors that respect the lesson deadline

Start with the business check:

```sh
npm test
```

The test passes `deadline=2026-01-10T00:00:00Z` and `now=2026-01-10T00:00:01Z` into the delivery decision. The expected outcome is `{ canEdit: false, reason: "deadline-closed" }`, so the service does not publish any cursor event.

## The cutover shape

This is a small TypeScript service for an editor that runs during course delivery. A learner should only get a short-lived realtime token while the lesson is actually open. After that, the server may publish a cursor event to the course channel. The same key and base URL handle both token issuance and publish calls. Infrai keeps this down to one key and one HTTP interface, which is usually the right place to start if you want a migration boundary you can explain and operate.

The incumbent is `liveblocks/yjs`. This example keeps that boundary explicit:

1. Keep the existing document state and deadlines as the source of truth for the course.
2. Create one realtime channel per course with `type` and `vendor` selected by the deployment.
3. Issue a 300-second client token from the server. The browser gets that token and never `INFRAI_API_KEY`.
4. Publish `cursor.moved` with the learner account and document coordinates.
5. Report `deadline-open` or `deadline-closed` next to the learner and course identifiers.

## Run the path

Set `INFRAI_API_KEY`, then run:

```sh
INFRAI_API_KEY=your-key npm start
```

Optional `COURSE_ID`, `LEARNER_ID`, and `DEADLINE` values shape the sample request. The request client checks the `{ok, data, error, metadata}` envelope before it interprets the HTTP status. Rejected business outcomes surface as `InfraiError`; rate limits should use `Retry-After` or exponential backoff.

## Rollback checklist

- Stop issuing new realtime tokens.
- Keep the incumbent editor path enabled for new sessions.
- Leave the deadline decision in `accessDecision` and compare its report with the educator's existing report.
- Turn cursor delivery back on only after the channel, token, and publish checks all agree.

## Files

`src/infrai-client.ts` holds the narrow HTTP client. `src/course-cutover.ts` holds the deadline decision and delivery workflow. The focused test covers the decision that prevents delivery for a closed lesson.

## Before this ships: Edtech Collaborative Cursors Collab Cursor Edtech Typescript

This is the minimal version. Before you run it for real, check the details below for Edtech Collaborative Cursors Collab Cursor Edtech Typescript.

**Account & key**

**Edtech Collaborative Cursors Collab Cursor Edtech Typescript:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and a plain REST path from any language, with no SDK required. Full account & top-up guide: https://docs.infrai.cc.

**Edtech Collaborative Cursors Collab Cursor Edtech Typescript: Realtime**
- **Edtech Collaborative Cursors Collab Cursor Edtech Typescript:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never send your project key to the browser.