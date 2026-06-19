import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// A small starter set of public ATS boards so the app has something to fetch
// on first run. These are EXAMPLES — manage your own list under Settings.
// To find a company's token: open their careers page and look at the URL,
//   e.g. boards.greenhouse.io/<token>, jobs.lever.co/<slug>, jobs.ashbyhq.com/<board>.
const STARTER_SOURCES: { type: string; token: string; name: string }[] = [
  { type: "greenhouse", token: "stripe", name: "Stripe" },
  { type: "greenhouse", token: "databricks", name: "Databricks" },
  { type: "lever", token: "netflix", name: "Netflix" },
  { type: "ashby", token: "ramp", name: "Ramp" },
];

async function main() {
  // Profile singleton
  await prisma.profile.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  // Default resume variant (empty until the user fills it in onboarding)
  const variantCount = await prisma.resumeVariant.count();
  if (variantCount === 0) {
    await prisma.resumeVariant.create({
      data: { label: "Default", content: "", isDefault: true },
    });
  }

  // Starter ATS sources
  for (const s of STARTER_SOURCES) {
    await prisma.companySource.upsert({
      where: { type_token: { type: s.type, token: s.token } },
      update: {},
      create: s,
    });
  }

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
