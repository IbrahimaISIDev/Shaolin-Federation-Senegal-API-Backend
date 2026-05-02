import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REGIONS = [
  { nom: 'Dakar',        code: 'DK', latitude: 14.6937, longitude: -17.4441 },
  { nom: 'Thiès',        code: 'TH', latitude: 14.7886, longitude: -16.9260 },
  { nom: 'Saint-Louis',  code: 'SL', latitude: 16.0179, longitude: -16.4896 },
  { nom: 'Diourbel',     code: 'DB', latitude: 14.6550, longitude: -16.2314 },
  { nom: 'Louga',        code: 'LG', latitude: 15.6179, longitude: -16.2243 },
  { nom: 'Fatick',       code: 'FK', latitude: 14.3390, longitude: -16.4110 },
  { nom: 'Kaolack',      code: 'KL', latitude: 14.1520, longitude: -16.0726 },
  { nom: 'Kaffrine',     code: 'KF', latitude: 14.1059, longitude: -15.5506 },
  { nom: 'Tambacounda',  code: 'TC', latitude: 13.7707, longitude: -13.6673 },
  { nom: 'Kédougou',     code: 'KD', latitude: 12.5549, longitude: -12.1758 },
  { nom: 'Kolda',        code: 'KO', latitude: 12.8979, longitude: -14.9410 },
  { nom: 'Ziguinchor',   code: 'ZG', latitude: 12.5681, longitude: -16.2719 },
  { nom: 'Sédhiou',      code: 'SD', latitude: 12.7081, longitude: -15.5572 },
  { nom: 'Matam',        code: 'MT', latitude: 15.6560, longitude: -13.2558 },
];

async function main() {
  console.log('Seeding régions...');
  for (const region of REGIONS) {
    await prisma.region.upsert({
      where: { code: region.code },
      update: {},
      create: region,
    });
  }
  console.log('✅ 14 régions insérées');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
