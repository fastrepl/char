---
alwaysApply: true
---

# Formatting

- Format using `dprint fmt` from the root. Do not use `cargo fmt`.
- Run it after you make changes.

# Typescript

- Avoid creating a bunch of types/interfaces if they are not shared. Especially for function props. Just inline them.
- After some amount of TypeScript changes, run `pnpm -r typecheck`.

# Rust

- After some amount of Rust changes, run `cargo check`.

# Mutation

- Never do manual state management for form/mutation. Things like setError is anti-pattern. use useForm(from tanstack-form) and useQuery/useMutation(from tanstack-query) for 99% cases.

# Comments

- By default, avoid writing comments at all.
- If you write one, it should be about "Why", not "What".

# Misc

- Do not create summary docs or example code file if not requested. Plan is ok.
- If there are many classNames and they have conditional logic, use `cn` (import it with `import { cn } from "@hypr/utils"`). It is similar to `clsx`. Always pass an array. Split by logical grouping.
- Use `motion/react` instead of `framer-motion`.

# Dev Docs

https://hyprnote.com/docs/developers
