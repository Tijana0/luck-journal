# Luck Journal

A journal you build yourself. Make pages (tabs) for whatever you're working on, fill them with ready-made blocks, and use it on any device. Your writing syncs to your account.

Built with **React + TypeScript + Vite**, stored in **Supabase** (Postgres with row-level security), and deployed to **GitHub Pages** with GitHub Actions.

## Features

- **Pages you control.** Add, rename, reorder and delete tabs.
- **Seven blocks** to stack on any page:

  | Block | What it does |
  |---|---|
  | Challenge list | Numbered goals with a checkbox, a category tag, a note on how it went, and a progress bar |
  | Habit tracker | Habits with their own weekly goal. Tap the days you showed up and see weeks on target. Queue habits for later. |
  | Idea cards | Cards with a status, a summary and labeled sections |
  | Notes | Lined, handwriting-style free writing |
  | Checklist | A quick to-do list |
  | Key facts | Small label and value tiles |
  | Text | A heading with paragraphs, bullets and **bold** |

- **Write mode and Edit mode.** Write mode is for using the journal: ticking, typing, logging days. Edit mode is for changing its structure. Keeping them apart means you can't rearrange things by accident on your phone.
- **Templates or a blank start.** Pick a blank journal, a 30-day challenge, a habit tracker or an idea board, then make it your own.
- **Export and import layouts.** Save your whole journal as a JSON file, as a backup or to recreate it in another account. You can also add the pages from a file or a template to an existing journal.
- **Username sign-in**, light and dark mode, works at phone width, and a back-to-top button for long pages.

## How it fits together

```
Browser (static files on GitHub Pages)
   │  supabase-js, signed in with username + password
   ▼
Supabase: Auth + Postgres
   journal_settings · pages · blocks · items · habit_logs   (each row belongs to one account)
```

- `pages` are the tabs. `blocks` sit on a page and have a `type` plus a JSON `data` column for their settings. List-style blocks keep their rows in `items`. Habit check-ins are `habit_logs`.
- Row-level security policies (`supabase/migrations/0001_journal_builder.sql`) mean each account can only ever read or write its own rows. The Supabase anon key in the browser is designed to be public.
- Changes show on screen immediately, are saved in order in the background, and the page reloads from the database if a save fails.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com). The free plan is enough.
2. Open **SQL Editor**, paste the contents of `supabase/migrations/0001_journal_builder.sql`, and click **Run**.
3. Go to **Authentication → Sign In / Providers** and switch off **Confirm email**. Usernames are stored as `<username>@luck-journal.app` and never receive mail, so confirmation emails can't arrive.
4. Copy the **Project URL** and the **publishable (anon) key**. The **Connect** button at the top of the dashboard shows both.

To keep the journal private to you, create your account first, then switch off **Allow new users to sign up** on the same settings page.

### 2. Run locally

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local   # paste your Project URL and key
npm run dev
```

### 3. Deploy to GitHub Pages

1. Push the repo to GitHub.
2. Go to **Settings → Secrets and variables → Actions** and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at repository level, on either the Variables or the Secrets tab. The build stops with a clear error if they are missing.
3. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
4. Push to `main`, or run the **Deploy to GitHub Pages** workflow. The site is served at `https://<user>.github.io/<repo>/`.

## Layout files

An exported layout looks like this. Templates in `src/templates.ts` use the same format.

```json
{
  "format": "journal-layout",
  "version": 1,
  "journal": { "eyebrow": "", "title": "My journal", "subtitle": "" },
  "pages": [
    {
      "title": "Habits",
      "blocks": [
        { "type": "habits", "title": "Habits", "items": [{ "name": "Stretching", "rhythm": "Every morning", "weeklyGoal": 7, "status": "active" }] },
        { "type": "notes", "title": "Reflections", "body": "" }
      ]
    }
  ]
}
```

An export includes everything you've written, so keep exported files private.

## Project structure

```
src/
  App.tsx                 sign-in gate, Write/Edit switch, page selection
  store.tsx               journal state, ordered saving, all database writes
  layout.ts               layout format: parse, import, export
  templates.ts            starter layouts
  types.ts                data types, block catalogue, safe JSON readers
  text.tsx                tiny safe formatter for text blocks
  blocks/                 the seven blocks (write + edit views)
  components/             header, tabs, page view, onboarding, tools, shared UI
supabase/migrations/      database schema and row-level security
.github/workflows/        build and deploy to GitHub Pages
```

## Ideas for later

- Drag-and-drop reordering
- Streaks and a monthly heatmap for habits
- Installable on a phone home screen (PWA)
- Tests for the layout import/export and week logic
