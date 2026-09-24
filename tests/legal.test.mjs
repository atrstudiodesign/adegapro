import { describe, expect, test } from "bun:test";
import { LEGAL_PROVIDER, LEGAL_DOCS, REQUIRED_LEGAL_ACCEPTANCES } from "../src/legal/legalDocuments.ts";

describe("ADEGA PRO legal contract identity", () => {
  test("uses the current ATR Studio legal entity", () => {
    expect(LEGAL_PROVIDER.legalName).toBe("ATR STUDIO DESIGNER E ASSESSORIA INOVA SIMPLES I.S. - ME");
    expect(LEGAL_PROVIDER.cnpj).toBe("57.514.866/0001-38");
  });

  test("requires every current legal document", () => {
    expect(REQUIRED_LEGAL_ACCEPTANCES.length).toBe(Object.keys(LEGAL_DOCS).length);
    for (const item of REQUIRED_LEGAL_ACCEPTANCES) {
      expect(item.version).toBe(LEGAL_DOCS[item.document_key].version);
    }
  });
});
