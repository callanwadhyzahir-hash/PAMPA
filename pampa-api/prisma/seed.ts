import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const companyTypes = [
  { code: 'SA', name: 'Sociedad Anónima' },
  { code: 'SRL', name: 'Sociedad de Responsabilidad Limitada' },
  { code: 'SAS', name: 'Sociedad por Acciones Simplificada' },
  { code: 'PERSONA_FISICA', name: 'Persona Física' },
  { code: 'COOPERATIVA', name: 'Cooperativa' },
  { code: 'ASOCIACION_CIVIL', name: 'Asociación Civil' },
  { code: 'FUNDACION', name: 'Fundación' },
] as const;

const taxConditions = [
  { code: 'RESPONSABLE_INSCRIPTO', name: 'Responsable Inscripto' },
  { code: 'MONOTRIBUTISTA', name: 'Monotributista' },
  { code: 'EXENTO', name: 'Exento' },
  { code: 'CONSUMIDOR_FINAL', name: 'Consumidor Final' },
  { code: 'NO_RESPONSABLE', name: 'No Responsable' },
] as const;

const currencies = [
  { code: 'ARS', name: 'Peso Argentino', symbol: '$' },
  { code: 'USD', name: 'Dólar Estadounidense', symbol: 'US$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'BRL', name: 'Real Brasileño', symbol: 'R$' },
] as const;

const argentinaStates = [
  {
    code: 'C',
    name: 'Ciudad Autónoma de Buenos Aires',
    cities: [{ name: 'Ciudad Autónoma de Buenos Aires', postalCode: 'C1000' }],
  },
  {
    code: 'B',
    name: 'Buenos Aires',
    cities: [
      { name: 'La Plata', postalCode: 'B1900' },
      { name: 'Mar del Plata', postalCode: 'B7600' },
      { name: 'Bahía Blanca', postalCode: 'B8000' },
    ],
  },
  {
    code: 'X',
    name: 'Córdoba',
    cities: [
      { name: 'Córdoba', postalCode: 'X5000' },
      { name: 'Río Cuarto', postalCode: 'X5800' },
      { name: 'Villa María', postalCode: 'X5900' },
    ],
  },
  {
    code: 'S',
    name: 'Santa Fe',
    cities: [
      { name: 'Rosario', postalCode: 'S2000' },
      { name: 'Santa Fe', postalCode: 'S3000' },
    ],
  },
  {
    code: 'M',
    name: 'Mendoza',
    cities: [{ name: 'Mendoza', postalCode: 'M5500' }],
  },
] as const;

type SeedResult = {
  created: number;
  existing: number;
};

async function seedByCode<T extends { code: string }>(
  records: readonly T[],
  findExisting: (codes: string[]) => Promise<Array<{ code: string }>>,
  create: (data: T[]) => Promise<{ count: number }>,
): Promise<SeedResult> {
  const existingRecords = await findExisting(records.map((record) => record.code));
  const existingCodes = new Set(existingRecords.map((record) => record.code));
  const recordsToCreate = records.filter((record) => !existingCodes.has(record.code));

  const result = recordsToCreate.length ? await create([...recordsToCreate]) : { count: 0 };

  return {
    created: result.count,
    existing: records.length - recordsToCreate.length,
  };
}

async function main() {
  const [companyTypesResult, taxConditionsResult, currenciesResult] = await Promise.all([
    seedByCode(
      companyTypes,
      (codes) => prisma.company_type.findMany({ where: { code: { in: codes } }, select: { code: true } }),
      (data) => prisma.company_type.createMany({ data }),
    ),
    seedByCode(
      taxConditions,
      (codes) => prisma.tax_condition.findMany({ where: { code: { in: codes } }, select: { code: true } }),
      (data) => prisma.tax_condition.createMany({ data }),
    ),
    seedByCode(
      currencies,
      (codes) => prisma.currency.findMany({ where: { code: { in: codes } }, select: { code: true } }),
      (data) => prisma.currency.createMany({ data: data.map((currency) => ({ ...currency, is_active: true })) }),
    ),
  ]);

  const created = companyTypesResult.created + taxConditionsResult.created + currenciesResult.created;
  const existing = companyTypesResult.existing + taxConditionsResult.existing + currenciesResult.existing;

  const argentina = await prisma.country.upsert({
    where: { iso_code: 'AR' },
    create: {
      iso_code: 'AR',
      name: 'Argentina',
      phone_code: '+54',
      is_active: true,
    },
    update: { is_active: true },
  });

  let statesCreated = 0;
  let citiesCreated = 0;
  for (const stateData of argentinaStates) {
    const existingState = await prisma.state.findFirst({
      where: { country_id: argentina.id, name: stateData.name },
    });
    const state = existingState
      ? await prisma.state.update({
          where: { id: existingState.id },
          data: { code: stateData.code, is_active: true },
        })
      : await prisma.state.create({
          data: {
            country_id: argentina.id,
            code: stateData.code,
            name: stateData.name,
            is_active: true,
          },
        });
    if (!existingState) statesCreated += 1;

    for (const cityData of stateData.cities) {
      const existingCity = await prisma.city.findFirst({
        where: { state_id: state.id, name: cityData.name },
      });
      if (existingCity) {
        await prisma.city.update({
          where: { id: existingCity.id },
          data: { postal_code: cityData.postalCode, is_active: true },
        });
      } else {
        await prisma.city.create({
          data: {
            state_id: state.id,
            name: cityData.name,
            postal_code: cityData.postalCode,
            is_active: true,
          },
        });
        citiesCreated += 1;
      }
    }
  }

  console.info(`Company Types: ${companyTypesResult.created} creados, ${companyTypesResult.existing} existentes.`);
  console.info(`Tax Conditions: ${taxConditionsResult.created} creados, ${taxConditionsResult.existing} existentes.`);
  console.info(`Currencies: ${currenciesResult.created} creados, ${currenciesResult.existing} existentes.`);
  console.info(`Provincias argentinas: ${statesCreated} creadas.`);
  console.info(`Ciudades argentinas: ${citiesCreated} creadas.`);
  console.info(`Total: ${created} creados, ${existing} existentes.`);
}

main()
  .catch((error: unknown) => {
    console.error('No se pudieron cargar los datos maestros.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
