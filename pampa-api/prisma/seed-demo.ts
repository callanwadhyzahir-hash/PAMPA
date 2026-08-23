import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const targetEmail = process.env.DEMO_TARGET_EMAIL?.trim().toLowerCase();

async function main() {
  if (!targetEmail) {
    throw new Error(
      'Definí DEMO_TARGET_EMAIL para identificar de forma segura la empresa que recibirá los datos.',
    );
  }

  const actor = await prisma.user.findUnique({
    where: { email: targetEmail },
    select: { id: true, company_id: true },
  });
  if (!actor) throw new Error('No existe un usuario con DEMO_TARGET_EMAIL.');

  const city = await prisma.city.findFirst({
    where: {
      name: 'Córdoba',
      is_active: true,
      state: { name: 'Córdoba', is_active: true },
    },
    select: { id: true },
  });
  if (!city) {
    throw new Error('Primero ejecutá npm.cmd run seed para cargar las ciudades.');
  }

  const result = await prisma.$transaction(async (tx) => {
    let branch = await tx.branch.findFirst({
      where: { company_id: actor.company_id, code: 'CENTRAL' },
    });
    if (!branch) {
      const address = await tx.address.create({
        data: {
          city_id: city.id,
          street: 'Bulevar San Juan',
          number: '123',
          neighborhood: 'Centro',
          zip_code: 'X5000',
        },
      });
      branch = await tx.branch.create({
        data: {
          company_id: actor.company_id,
          address_id: address.id,
          name: 'Casa Central',
          code: 'CENTRAL',
          email: 'central@example.test',
          phone: '3515550100',
          is_main: true,
          is_active: true,
        },
      });
    }

    await tx.user.update({
      where: { id: actor.id },
      data: { branch_id: branch.id },
    });

    const warehouse = await tx.warehouse.upsert({
      where: {
        company_id_code: {
          company_id: actor.company_id,
          code: 'DEP-CENTRAL',
        },
      },
      create: {
        company_id: actor.company_id,
        branch_id: branch.id,
        name: 'Depósito Central',
        code: 'DEP-CENTRAL',
        description: 'Depósito de prueba para validar inventario y ventas.',
        is_main: true,
        is_active: true,
      },
      update: { branch_id: branch.id, is_active: true },
    });

    const category = await tx.product_category.upsert({
      where: {
        company_id_name: {
          company_id: actor.company_id,
          name: 'Datos de prueba',
        },
      },
      create: {
        company_id: actor.company_id,
        name: 'Datos de prueba',
        description: 'Categoría identificable y descartable para auditoría local.',
      },
      update: { is_active: true },
    });

    let productCount = 0;
    for (const data of [
      {
        code: 'TEST-LAPIZ',
        name: 'Lápiz negro de prueba',
        cost: new Prisma.Decimal('250'),
        sale_price: new Prisma.Decimal('500'),
        quantity: new Prisma.Decimal('120'),
      },
      {
        code: 'TEST-CUADERNO',
        name: 'Cuaderno A4 de prueba',
        cost: new Prisma.Decimal('2800'),
        sale_price: new Prisma.Decimal('4500'),
        quantity: new Prisma.Decimal('35'),
      },
      {
        code: 'TEST-MARCADOR',
        name: 'Marcador permanente de prueba',
        cost: new Prisma.Decimal('900'),
        sale_price: new Prisma.Decimal('1600'),
        quantity: new Prisma.Decimal('8'),
      },
    ]) {
      const product = await tx.product.upsert({
        where: {
          company_id_code: { company_id: actor.company_id, code: data.code },
        },
        create: {
          company_id: actor.company_id,
          category_id: category.id,
          code: data.code,
          name: data.name,
          product_type: 'PRODUCT',
          unit: 'UNIT',
          cost: data.cost,
          sale_price: data.sale_price,
          tax_rate: new Prisma.Decimal('21'),
          tracks_stock: true,
          is_active: true,
        },
        update: {
          category_id: category.id,
          name: data.name,
          cost: data.cost,
          sale_price: data.sale_price,
          is_active: true,
        },
      });
      const existingStock = await tx.stock.findFirst({
        where: { warehouse_id: warehouse.id, product_id: product.id, variant_id: null },
        select: { id: true },
      });
      if (existingStock) {
        await tx.stock.update({
          where: { id: existingStock.id },
          data: {
            quantity: data.quantity,
            minimum_quantity: new Prisma.Decimal('10'),
          },
        });
      } else {
        await tx.stock.create({
          data: {
            company_id: actor.company_id,
            warehouse_id: warehouse.id,
            product_id: product.id,
            quantity: data.quantity,
            minimum_quantity: new Prisma.Decimal('10'),
          },
        });
      }
      productCount += 1;
    }

    for (const data of [
      {
        code: 'TEST-CF-001',
        first_name: 'Ana',
        last_name: 'Pérez',
        email: 'ana.perez@example.test',
        is_company: false,
      },
      {
        code: 'TEST-EMP-001',
        business_name: 'Comercio Demo SRL',
        tax_id: '30700000001',
        email: 'compras@example.test',
        is_company: true,
      },
    ]) {
      await tx.client.upsert({
        where: {
          company_id_code: { company_id: actor.company_id, code: data.code },
        },
        create: {
          company_id: actor.company_id,
          ...data,
          credit_limit: new Prisma.Decimal('100000'),
          notes: 'Dato de prueba local.',
        },
        update: { ...data, is_active: true },
      });
    }

    return {
      branch: branch.name,
      warehouse: warehouse.name,
      products: productCount,
      clients: 2,
    };
  });

  console.info('Datos de prueba listos:', result);
}

main()
  .catch((error: unknown) => {
    console.error(
      'No se pudieron cargar los datos de prueba.',
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
