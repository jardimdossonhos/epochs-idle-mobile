import fs from "fs";
import path from "path";

describe("UTF-8 Integrity in source code", () => {
  it("game-session.ts should not contain double-encoded mojibake", () => {
    const filePath = path.resolve(__dirname, "../../src/application/game-session.ts");
    const content = fs.readFileSync(filePath, "utf8");
    // "SimulaÃ§Ã£o" is the mojibake version
    expect(content).not.toMatch(/SimulaÃ§Ã£o/);
    expect(content).not.toMatch(/AÃ§Ã£o/);
    
    // Check if the fixed versions exist
    expect(content).toMatch(/Simulação/);
    expect(content).toMatch(/Ação/);
  });
});