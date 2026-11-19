Stack: React + TypeScript + Vite + Tailwind + shadcn/ui + Supabase.
The full requirements are in docs/PROJECT_SPEC.md: read the relevant section
before building each feature.

HARD RULES:
- Never create, alter or drop database tables, policies, functions or
  migrations, and never run SQL. The backend is managed separately in
  /supabase. If something is missing in the database, tell me what you need
  and stop.
- Use the existing Supabase types and client in src/integrations/supabase.
  Never hardcode keys.
- Build only the phase I name. Use placeholder pages for later phases.
- Every screen needs loading, empty and error states, must be mobile-first,
  keyboard accessible and have labelled controls.
- Design: calm editorial. Cream #F8F6F0 background, lavender #DED8F3,
  purple #8272B5 primary, sage #B5C8B2 accent, charcoal #292B35 text.
  Plus Jakarta Sans headings, Inter body. Rounded, spacious, not corporate,
  not social-media-like.
- Keep components small, grouped by feature folder.
