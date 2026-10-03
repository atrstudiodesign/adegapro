import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { LEGAL_PROVIDER, LEGAL_DOCS, REQUIRED_LEGAL_ACCEPTANCES, LEGAL_CONTENT_HASHES, canonicalLegalDocumentPayload } from "../src/legal/legalDocuments.ts";

describe("ADEGA PRO legal contract identity", () => {
  test("uses the current ATR Studio legal entity", () => {
    expect(LEGAL_PROVIDER.legalName).toBe("ATR STUDIO DESIGNER E ASSESSORIA INOVA SIMPLES I.S. - ME");
    expect(LEGAL_PROVIDER.cnpj).toBe("57.514.866/0001-38");
  });

  test("requires every client-facing legal document without mixing seller policy", () => {
    const clientDocs = Object.keys(LEGAL_DOCS).filter((key) => key !== "sales_partner_policy");
    expect(REQUIRED_LEGAL_ACCEPTANCES.length).toBe(clientDocs.length);
    expect(REQUIRED_LEGAL_ACCEPTANCES.map((item) => item.document_key).sort()).toEqual(clientDocs.sort());
    for (const item of REQUIRED_LEGAL_ACCEPTANCES) {
      expect(item.version).toBe(LEGAL_DOCS[item.document_key].version);
    }
  });
});


describe("ADEGA PRO reproducible legal hashes", () => {
  test("pins every required r8 document to its canonical SHA-256", () => {
    for (const item of REQUIRED_LEGAL_ACCEPTANCES) {
      const payload = canonicalLegalDocumentPayload(item.document_key);
      const actual = "sha256:" + createHash("sha256").update(payload, "utf8").digest("hex");
      expect(actual).toBe(LEGAL_CONTENT_HASHES[item.document_key]);
    }
  });
});
