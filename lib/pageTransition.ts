// Module-level state persists across client-side navigations within the same
// browser session, which is exactly what we need:
//   - One transition type per page visit
//   - Same type for all sections on that page
//   - On return to any page, the new type differs from the one used on the
//     previous page (so consecutive visits never repeat)

export type TransitionType = "dive" | "orbital" | "parallax";

const ALL: TransitionType[] = ["dive", "orbital", "parallax"];

let lastTransition: TransitionType | null = null;

export function pickPageTransition(): TransitionType {
  const pool = lastTransition ? ALL.filter(t => t !== lastTransition) : ALL;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  lastTransition = chosen;
  return chosen;
}
