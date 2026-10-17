# Settle the edge cases the verification scenarios exposed

Amended by [Correct the simulator against the real Checkbox](0018-correct-the-simulator-against-the-real-checkbox.md): point 3: the ceiling is 300 bar, not 330.

Writing exact test vectors exposed six points the earlier decisions left open:

1. **Alarmgrenzen are literal percentages:** 33 % / 66 % fire at 9:54 / 19:48 (30 min) and 6:36 / 13:12 (20 min), not at exact thirds ("exact enough"). (§2.6)
2. **A pressure entry on an overdue Trupp re-arms** Einsatzzeit erreicht and the −[06] repeats. (§3.6)
3. **A raise via Druck ändern is capped** at `P_N` + 10 % = 330 bar, the same ceiling as the Anfangsdruck. (§1.8)
4. **The Rückzugsdruck is rounded down** to whole bar, like the estimate. (§5.7)
5. **Unreachable branches are not implemented.** Rückzugsalarmmodus off and [73] = 0 stay recorded only. (§9.3)
6. **Each `tick` carries both clocks**, `{ type: "tick", now, realNow }`: simulated time for Einsatz timing and real time for the display timings. Every timeout stays in the core, and pause stops both. (§9.2)

The section numbers refer to the [timing and alarm rules](../research/timing-and-alarm-rules.md). The vectors are in the [verification scenarios](../research/verification-scenarios.md).

Decided in [Settle the edge cases the verification scenarios exposed](https://github.com/lharzenetter/checkbox-simulator/issues/22).
