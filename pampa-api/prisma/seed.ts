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
      { name: 'Quilmes', postalCode: 'B1878' },
      { name: 'San Isidro', postalCode: 'B1642' },
      { name: 'Tigre', postalCode: 'B1648' },
      { name: 'Morón', postalCode: 'B1708' },
      { name: 'Tandil', postalCode: 'B7000' },
      { name: 'Pergamino', postalCode: 'B2700' },
      { name: 'Junín', postalCode: 'B6000' },
    ],
  },
  {
    code: 'X',
    name: 'Córdoba',
    cities: [
      { name: 'Córdoba', postalCode: 'X5000' },
      { name: 'Río Cuarto', postalCode: 'X5800' },
      { name: 'Villa María', postalCode: 'X5900' },
      { name: 'Villa Carlos Paz', postalCode: 'X5152' },
      { name: 'San Francisco', postalCode: 'X2400' },
      { name: 'Río Tercero', postalCode: 'X5850' },
    ],
  },
  {
    code: 'S',
    name: 'Santa Fe',
    cities: [
      { name: 'Rosario', postalCode: 'S2000' },
      { name: 'Santa Fe', postalCode: 'S3000' },
      { name: 'Rafaela', postalCode: 'S2300' },
      { name: 'Venado Tuerto', postalCode: 'S2600' },
      { name: 'Reconquista', postalCode: 'S3560' },
    ],
  },
  {
    code: 'M',
    name: 'Mendoza',
    cities: [
      { name: 'Mendoza', postalCode: 'M5500' },
      { name: 'San Rafael', postalCode: 'M5600' },
      { name: 'Godoy Cruz', postalCode: 'M5501' },
      { name: 'Luján de Cuyo', postalCode: 'M5507' },
      { name: 'Maipú', postalCode: 'M5515' },
    ],
  },
  {
    code: 'K',
    name: 'Catamarca',
    cities: [
      { name: 'San Fernando del Valle de Catamarca', postalCode: 'K4700' },
      { name: 'Recreo', postalCode: 'K4728' },
      { name: 'Belén', postalCode: 'K4750' },
    ],
  },
  {
    code: 'T',
    name: 'Tucumán',
    cities: [
      { name: 'San Miguel de Tucumán', postalCode: 'T4000' },
      { name: 'Yerba Buena', postalCode: 'T4107' },
      { name: 'Concepción', postalCode: 'T4110' },
    ],
  },
  {
    code: 'E',
    name: 'Entre Ríos',
    cities: [
      { name: 'Paraná', postalCode: 'E3100' },
      { name: 'Concordia', postalCode: 'E3200' },
      { name: 'Gualeguaychú', postalCode: 'E2820' },
      { name: 'Concepción del Uruguay', postalCode: 'E3260' },
    ],
  },
  {
    code: 'N',
    name: 'Misiones',
    cities: [
      { name: 'Posadas', postalCode: 'N3300' },
      { name: 'Oberá', postalCode: 'N3360' },
      { name: 'Eldorado', postalCode: 'N3380' },
      { name: 'Puerto Iguazú', postalCode: 'N3370' },
    ],
  },
  {
    code: 'Y',
    name: 'Jujuy',
    cities: [
      { name: 'San Salvador de Jujuy', postalCode: 'Y4600' },
      { name: 'Palpalá', postalCode: 'Y4612' },
      { name: 'Perico', postalCode: 'Y4623' },
    ],
  },
  {
    code: 'P',
    name: 'Formosa',
    cities: [
      { name: 'Formosa', postalCode: 'P3600' },
      { name: 'Clorinda', postalCode: 'P3610' },
    ],
  },
  {
    code: 'A',
    name: 'Salta',
    cities: [
      { name: 'Salta', postalCode: 'A4400' },
      { name: 'Tartagal', postalCode: 'A4530' },
      { name: 'Orán', postalCode: 'A4530' },
    ],
  },
  {
    code: 'J',
    name: 'San Juan',
    cities: [
      { name: 'San Juan', postalCode: 'J5400' },
      { name: 'Rivadavia', postalCode: 'J5401' },
      { name: 'Rawson', postalCode: 'J5416' },
    ],
  },
  {
    code: 'D',
    name: 'San Luis',
    cities: [
      { name: 'San Luis', postalCode: 'D5700' },
      { name: 'Villa Mercedes', postalCode: 'D5730' },
    ],
  },
  {
    code: 'R',
    name: 'Río Negro',
    cities: [
      { name: 'Viedma', postalCode: 'R8500' },
      { name: 'San Carlos de Bariloche', postalCode: 'R8400' },
      { name: 'General Roca', postalCode: 'R8332' },
      { name: 'Cipolletti', postalCode: 'R8324' },
    ],
  },
  {
    code: 'Q',
    name: 'Neuquén',
    cities: [
      { name: 'Neuquén', postalCode: 'Q8300' },
      { name: 'Cutral Có', postalCode: 'Q8318' },
      { name: 'San Martín de los Andes', postalCode: 'Q8370' },
    ],
  },
  {
    code: 'U',
    name: 'Chubut',
    cities: [
      { name: 'Rawson', postalCode: 'U9103' },
      { name: 'Comodoro Rivadavia', postalCode: 'U9000' },
      { name: 'Trelew', postalCode: 'U9100' },
      { name: 'Puerto Madryn', postalCode: 'U9120' },
    ],
  },
  {
    code: 'Z',
    name: 'Santa Cruz',
    cities: [
      { name: 'Río Gallegos', postalCode: 'Z9400' },
      { name: 'Caleta Olivia', postalCode: 'Z9011' },
      { name: 'El Calafate', postalCode: 'Z9405' },
    ],
  },
  {
    code: 'V',
    name: 'Tierra del Fuego',
    cities: [
      { name: 'Ushuaia', postalCode: 'V9410' },
      { name: 'Río Grande', postalCode: 'V9420' },
    ],
  },
  {
    code: 'W',
    name: 'Corrientes',
    cities: [
      { name: 'Corrientes', postalCode: 'W3400' },
      { name: 'Goya', postalCode: 'W3450' },
      { name: 'Mercedes', postalCode: 'W3470' },
    ],
  },
  {
    code: 'L',
    name: 'La Pampa',
    cities: [
      { name: 'Santa Rosa', postalCode: 'L6300' },
      { name: 'General Pico', postalCode: 'L6360' },
    ],
  },
  {
    code: 'F',
    name: 'La Rioja',
    cities: [
      { name: 'La Rioja', postalCode: 'F5300' },
      { name: 'Chilecito', postalCode: 'F5360' },
    ],
  },
  {
    code: 'G',
    name: 'Santiago del Estero',
    cities: [
      { name: 'Santiago del Estero', postalCode: 'G4200' },
      { name: 'La Banda', postalCode: 'G4300' },
    ],
  },
  {
    code: 'H',
    name: 'Chaco',
    cities: [
      { name: 'Resistencia', postalCode: 'H3500' },
      { name: 'Presidencia Roque Sáenz Peña', postalCode: 'H3700' },
    ],
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
