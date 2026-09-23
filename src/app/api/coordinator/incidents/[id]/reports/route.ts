import { api } from "@/server/http";
import { requireCoordinator } from "@/server/auth";
import { readStore } from "@/server/repository";
export const GET = api(async (_, context) => {
  await requireCoordinator();
  const { id } = await context.params;
  return {
    reports: (await readStore()).reports
      .filter((r) => r.incidentId === id)
      .map((r) => ({
        ...r,
        // Seed provenance stays in storage; omit its boilerplate from the
        // prototype's report presentation without altering reporter content.
        notes: [
          "Fictional demonstration evidence.",
          "Fictional demo report at a real Google Place. Not an actual incident.",
        ].includes(r.notes)
          ? ""
          : r.notes,
        normalized: r.normalized
          ? {
              ...r.normalized,
              extractionNotes: r.normalized.extractionNotes.filter(
                (note) =>
                  note !==
                  "Seeded demonstration report; no real-world incident is asserted.",
              ),
            }
          : null,
        sourceFingerprint: "[private]",
        independenceGroup: "[private]",
      })),
  };
});
