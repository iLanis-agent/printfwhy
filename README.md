# PrintfWhy

Shows what a C printf format prints for the given arguments and what each spec does (flags, width, precision, `*`, length modifiers) for d i u o x X c s %.

Open `app.html` (GitHub Pages). Everything runs client side.

## Testing
`oracle.py <seed> <n> <out>` generates n random single specs (random flags, width, precision, `*`, length modifier, value) and merges them into formats of 1-3 specs with literal text, then runs them through gcc 11.4 + glibc printf, casting each argument to the type the spec expects. `test-engine.js` compares `engine.js`.

- Seeds 2-7, 10,000 specs each: 34,318 formats, 13,852 whose behaviour the C standard defines (compared, 0 mismatches) and 20,466 using combinations the standard leaves undefined (`#` with d/i/u/c/s, `0` with c/s, `+` or space on unsigned/c/s, precision with c, bad length modifiers). The engine reports these as undefined and prints what glibc prints; it matched glibc on all 20,466, but that is glibc behaviour only.
- Seed 1 (3,000 formats) was used for a first check; no bugs were found by the oracle in this app.
- Rules were taken from the cppreference fprintf page (fetched).

## Limits
- %f %F %e %E %g %G %a %A %p %n and wide characters (`%lc`, `%ls`) are explained, not computed.
- Type sizes assume 64-bit Linux (int 32 bit, long 64 bit).
- Strings are bytes as typed; no locale effects. Escapes like `\n` are not interpreted.
