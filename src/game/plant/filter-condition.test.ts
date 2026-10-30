import { describe, expect, it } from "vite-plus/test";
import { filterCondition, filterConditionWords } from "./filter-condition";
import { processPorts } from "./ideal-filter";

const words = (bed: Parameters<typeof filterCondition>[0]) =>
  filterConditionWords(filterCondition(bed));
const bed = {
  ports: processPorts("service", 45),
  dirt: 0.5,
  fissuring: 0,
  unsettled: 0,
};
const backwash = processPorts("backwash", 34);
const rinse = processPorts("rinse", 45);
const still = processPorts("off", 0);

describe("a sand filter’s condition, in words", () => {
  it("says the owner’s examples", () => {
    expect(words({ ...bed, ports: backwash })).toBe("backwashing");
    expect(words(bed)).toBe("filtering, and seems clean");
    expect(words({ ...bed, dirt: 1.4 })).toBe("filtering, but seems dirty");
    expect(words({ ...bed, dirt: 2.5, fissuring: 0.4 })).toBe(
      "filtering, but seems very dirty and the sand is pitted",
    );
    expect(words({ ...bed, ports: rinse })).toBe("rinsing");
  });

  it("rinses only when its flow goes to waste, not back into service unrinsed (the owner, 2026-10-28)", () => {
    // Straight back to filtering after a backwash, its bed still unsettled.
    expect(words({ ...bed, unsettled: 0.3 })).toBe(
      "filtering, and seems clean",
    );
    expect(words({ ...bed, unsettled: 0.3, ports: rinse })).toBe("rinsing");
  });

  it("stands while nothing flows, and still says how it seems", () => {
    expect(words({ ...bed, ports: still })).toBe("standing, and seems clean");
    expect(
      words({ ...bed, ports: processPorts("service", 0.2), dirt: 1.2 }),
    ).toBe("standing, but seems dirty");
  });

  it("calls a clean bed with pitted sand not fine", () => {
    expect(words({ ...bed, fissuring: 0.3 })).toBe(
      "filtering, but seems clean and the sand is pitted",
    );
  });
});
