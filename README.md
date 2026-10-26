This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Supabase setup

The app works out of the box with no configuration: with no Supabase env vars
set, every page reads and writes the local `localStorage` backend.

To enable cloud persistence and email/password auth:

1. **Create a project** at <https://supabase.com/dashboard> and, in
   **Project Settings → API**, copy the **Project URL** and the
   **publishable key**. Use only the publishable key — never a private server
   key.
2. **Set the env vars** in `.env.local` (see `.env.example`):

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
   ```

   With both set the app uses Supabase; otherwise it falls back to local.
3. **Apply the migration** in `supabase/migrations/0001_init.sql` with
   `supabase link --project-ref <ref> && supabase db push`, or by pasting the
   file into the dashboard SQL editor. It creates the tables, indexes,
   row-level-security policies and the atomic `stop_timer` function. Verify it
   statically with `npm run check:rls`.
4. **Configure auth URLs** in **Authentication → URL Configuration**: set the
   Site URL and allow `<origin>/auth/callback` and `<origin>/auth/confirm` as
   redirect URLs.

Full details, including the RLS model, are in
[`supabase/README.md`](supabase/README.md). The `npm run build` step runs
`check:secrets`, which fails if a privileged Supabase credential keyword ever
appears in the repository.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
