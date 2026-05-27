import ApprovedLicense from "../models/ApprovedLicense";

const SEED_LICENSES = [
  "TN-14587",
  "TN-98741",
  "MED-20245",
  "DOC-77881",
  "CARD-55120",
];

export async function seedApprovedLicenses(): Promise<void> {
  try {
    const count = await ApprovedLicense.countDocuments();
    if (count > 0) {
      console.log(
        `✅ ApprovedLicenses déjà peuplée (${count} entrées) — seed ignoré`
      );
      return;
    }

    const docs = SEED_LICENSES.map((ln) => ({ licenseNumber: ln }));
    await ApprovedLicense.insertMany(docs);
    console.log(
      `🌱 Seed: ${SEED_LICENSES.length} licences pré-approuvées insérées`
    );
  } catch (error) {
    console.error("❌ Erreur seed ApprovedLicenses:", error);
  }
}
