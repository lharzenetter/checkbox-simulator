import { it } from "vitest";
import { inProcessWindow } from "./in-process-driver";
import { scenarios } from "./scenario";
import "./scenarios/power-on";
import "./scenarios/login";
import "./scenarios/alarm";
import "./scenarios/logoff";
import "./scenarios/sicherheitstrupp";

for (const { name, run } of scenarios()) {
  it(name, () => run(inProcessWindow()));
}
