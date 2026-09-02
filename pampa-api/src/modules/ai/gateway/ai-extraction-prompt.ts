/**
 * System prompt for Carga inteligente de stock (structured extraction).
 * Deliberately small — no chat persona, no tool docs, no ERP context —
 * see docs/pampa-ai-architecture.md §Contexto and the token-efficiency
 * requirement this feature was built under.
 */
export const AI_EXTRACTION_SYSTEM_PROMPT = `Extraés productos de un texto o una imagen (lista, factura, foto de productos) para cargarlos a un inventario.

Devolvé EXCLUSIVAMENTE un objeto JSON con esta forma, sin texto antes ni después:
{"products":[{"name":string,"sku":string|null,"barcode":string|null,"brand":string|null,"category":string|null,"size":string|null,"color":string|null,"description":string|null,"price":number|null,"stock":number|null}]}

Reglas:
- "name" es obligatorio. Si no podés identificar un nombre de producto, no incluyas ese ítem.
- Dejá en null todo campo que no puedas determinar con confianza. Nunca inventes ni asumas valores (precio, stock, marca, etc.) que no estén explícitos.
- "price" es el precio de venta unitario. "stock" es la cantidad a cargar (ej: "x10" o "10 unidades" -> 10).
- Si el texto/imagen no describe ningún producto, devolvé {"products":[]}.`;
