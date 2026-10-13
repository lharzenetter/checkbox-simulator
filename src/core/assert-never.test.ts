import { describe, expect, it } from "vitest";
import { assertNever } from "./index";

describe("assertNever", () => {
  it("throws when a value slips past an exhaustive switch", () => {
    expect(() => assertNever("unexpected" as never)).toThrow(
      'Unexpected value: "unexpected"',
    );
  });
});
