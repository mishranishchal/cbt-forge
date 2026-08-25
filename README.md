# CBT Forge

CBT Forge imports PDF, TXT, JSON, and pasted question text into validated question JSON, then supports configuration, CBT attempts, scoring, analytics, and exports.

Implemented phases:

- Phase 1: local PDF/TXT/JSON extraction, image preservation, answer/explanation matching, validation, review/editing, demo data
- Phase 2: advanced question bank review, bulk editing, ordering, metadata organization, test configuration, validation, preview
- Phase 3: CBT test-taking, timers, answer recording, scoring, analytics, results, and JSON/HTML/PDF exports

Not implemented yet: authentication, payments, deployment, and PostgreSQL.

## Requirements

- Python 3.11+
- Node.js 20+
- Tesseract OCR is optional. If it is unavailable, image OCR reports a clear warning and the OCR service can be replaced later.

## Project Structure

- `backend/`: FastAPI API, local parsers, PyMuPDF PDF services, optional OCR and AI abstractions, validation, tests
- `frontend/`: Next.js, React, TypeScript, Tailwind UI
- `data/uploads/`: local uploaded PDFs, ignored by Git
- `data/extracted_images/`: extracted/rendered PDF visuals, ignored by Git
- `data/tests/`: local extraction JSON records and Phase 2 `configuration.json`

## Environment Variables

Backend: copy `backend/.env.example` to `backend/.env`.

```env
AI_ENABLED=false
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_SITE_NAME=CBT Forge
CORS_ORIGINS=http://localhost:3000
```

Frontend: copy `.env.example` to `.env`.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

AI is disabled by default. `OPENROUTER_API_KEY` and the OpenRouter settings are optional, read only by FastAPI, and never exposed to frontend JavaScript.

## Run Backend

```powershell
cd cbt-forge\backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend URL: `http://localhost:8000`

## Run Frontend

```powershell
cd cbt-forge\frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:3000`

## Optional AI Assistance

The backend retains an OpenAI-compatible OpenRouter provider for future, user-initiated assistance only. It is outside the import, CBT, scoring, analytics, and export paths.

`https://openrouter.ai/api/v1/chat/completions`

Default model:

`OPENROUTER_MODEL=openrouter/free`

Set `AI_ENABLED=true` and configure a key only when enabling that future feature. With `AI_ENABLED=false`, no AI request is made.

## Demo Mode

Demo mode works without an OpenRouter key.

1. Start backend and frontend.
2. Open `http://localhost:3000`.
3. Click `Load Demo`.
4. Review and edit the 10 seeded questions.
5. Open `Configure Test` and save a complete configuration.

## Import Questions

1. Open `http://localhost:3000`.
2. Click `Create CBT`.
3. Select one or more `.pdf`, `.txt`, or `.json` files, or paste text directly.
4. Assign each role: `Question Paper`, `Answer Key`, `Explanation`, or `Other`.
5. Optionally paste question text, answer key text, and explanation text.
6. Click `Extract Questions`.
7. Click `Review Questions`.
8. Edit a question and click `Save`; the change persists in `data/tests/{test_id}/questions.json`.
9. Click `Configure Test`; the configuration persists in `data/tests/{test_id}/configuration.json`.

Answer key patterns supported deterministically include:

```text
1-A
Q2 B
1. A
Question 1: A
```

## Testing

```powershell
cd cbt-forge\backend
.venv\Scripts\activate
pytest
```

Tests cover PDF, TXT, JSON, invalid JSON, empty TXT, image/mixed PDFs, validation, duplicate numbers, missing answers/explanations, option and answer normalization, disabled AI, and missing OpenRouter configuration.
Phase 2 tests also cover question editing behavior through services, deletion, duplication, reordering, bulk editing, section creation, configuration validation, timing/marking validation, configuration persistence, stable question IDs, and image path validation.

## Phase 2 Routes

- Advanced review: `http://localhost:3000/review/{test_id}`
- Configuration: `http://localhost:3000/configure/{test_id}`
- Configuration preview: `http://localhost:3000/configure/{test_id}/preview`

## Phase 2 API

- `GET /api/tests/{test_id}/questions`
- `PUT /api/questions/{question_id}`
- `DELETE /api/questions/{question_id}`
- `POST /api/questions/{question_id}/duplicate`
- `POST /api/questions/bulk-update`
- `POST /api/questions/reorder`
- `POST /api/tests/{test_id}/organize`
- `GET /api/tests/{test_id}/configuration`
- `PUT /api/tests/{test_id}/configuration`
- `POST /api/tests/{test_id}/validate`

Question IDs are stable and scoped to the test during extraction, for example `test_abc_q001`. The app continues using local JSON persistence from Phase 1; this is persistent storage, so SQLite was not added in Phase 2.

`Organize Questions` uses local categorization by default. It may use optional AI metadata assistance only when `AI_ENABLED=true`.

## Troubleshooting

- `AI assistance is currently disabled.`: expected default state; imports and CBT features continue locally.
- `Local OCR is not installed. Image-only pages could not be read.`: install Tesseract and ensure it is on `PATH` to read scanned pages.
- Frontend cannot reach API: confirm FastAPI is running on port `8000` and `NEXT_PUBLIC_API_BASE_URL` is `http://localhost:8000`.

## Limitations

- Deterministic parsing supports common numbered MCQ layouts. Complex layouts and tables may need review in the question bank.
- OCR is optional; without Tesseract, imports continue but scanned image-only pages are reported for review.
- Data is stored as local JSON for Phase 1 and Phase 2; PostgreSQL is intentionally deferred.
- Image add/replace is represented in the editor by managed image path records and deletion.
