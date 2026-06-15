import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.slot.createMany({
    data: [
      {
        name: "Stellplatz A1",
        type: "CAMPER",
        description: "Großer Platz für Camper bis 8m, mit Stromanschluss (16A).",
        pricePerDay: 15,
        pricePerMonth: 280,
        accessCode: "1234",
      },
      {
        name: "Stellplatz A2",
        type: "CAMPER",
        description: "Sonniger Platz, ideal für Camper und kleine Wohnmobile.",
        pricePerDay: 15,
        pricePerMonth: 280,
        accessCode: "5678",
      },
      {
        name: "Stellplatz B1",
        type: "CARAVAN",
        description: "Breiter Wohnwagen-Platz mit Wasseranschluss.",
        pricePerDay: 18,
        pricePerMonth: 320,
        accessCode: "9012",
      },
      {
        name: "Garage 1",
        type: "GARAGE",
        description: "Abgeschlossene Garage, 6m × 3m, ideal für Motorrad oder Kleinwagen.",
        pricePerDay: 8,
        pricePerMonth: 120,
        accessCode: "3456",
      },
    ],
  });

  console.log("✅ Beispiel-Slots angelegt");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
