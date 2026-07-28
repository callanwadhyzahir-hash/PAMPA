import { z } from 'zod';

const optionalText = (maxLength: number) => z.string()
  .trim()
  .max(maxLength, `Debe tener como máximo ${maxLength} caracteres.`);

const optionalUrl = z.literal('').or(z.string()
  .trim()
  .url('Ingresá una URL válida.'));

const companyFormSchema = z.object({
  companyTypeId: z.string().uuid('Seleccioná un tipo de empresa.'),
  taxConditionId: z.string().uuid('Seleccioná una condición fiscal.'),
  currencyId: z.string().uuid('Seleccioná una moneda.'),
  name: z.string()
    .trim()
    .min(1, 'La razón social es obligatoria.')
    .max(200, 'La razón social debe tener como máximo 200 caracteres.'),
  legalName: optionalText(250),
  taxId: z.string()
    .trim()
    .regex(/^\d{2}-?\d{8}-?\d$/, 'Ingresá un CUIT válido de 11 dígitos.'),
  email: z.literal('').or(z.string()
    .trim()
    .email('Ingresá un correo electrónico válido.')),
  phone: optionalText(50),
  website: optionalUrl,
  logoUrl: optionalUrl,
  isActive: z.boolean(),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

export { companyFormSchema };
export type { CompanyFormValues };
