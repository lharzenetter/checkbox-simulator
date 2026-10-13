# Fix the factory defaults the manual leaves open

Section 9.1 of the manual lists the parameters but gives **no defaults**. The simulator fixes a value for each parameter it uses, chosen with the user, who knows the real device. The key ones:

- Rückzugsalarmmodus on for 30 and 20 min
- [42] = 50 bar
- cylinders fixed at 300 bar (`P_N` = 300)
- [76] = [73] = 5 bar, so raising is allowed
- [13] = 15 s
- an Abschaltzeit of 25 s
- SICHER alternating 1 s / 1 s
- the backlight always lit

**The display timings ([13], Abschaltzeit, SICHER) run on real time**, like the X + Check hold. The speed control scales only Einsatz timing, and pause freezes both. Neither manual conflict ([48]/[49] numbering, [82]'s two meanings) changes behaviour.

The full table is [section 9 of the timing and alarm rules](../research/timing-and-alarm-rules.md#9-factory-defaults). In code, the values live in `core/parameters.ts`.

Decided in [Fix the factory defaults the manual leaves open](https://github.com/lharzenetter/checkbox-simulator/issues/16).
