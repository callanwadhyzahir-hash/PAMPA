import { AiInvalidResponseError } from '../ai.errors';
import { parseExtractionResponse } from './ai-extraction.types';

describe('parseExtractionResponse', () => {
  it('parses a well-formed products array, filling every field', () => {
    const result = parseExtractionResponse(
      JSON.stringify({
        products: [
          {
            name: 'Remera Nike Negra',
            sku: null,
            barcode: null,
            brand: 'Nike',
            category: 'Remeras',
            size: 'M',
            color: 'Negro',
            description: null,
            price: 25000,
            stock: 10,
          },
        ],
      }),
      'gemini',
    );

    expect(result).toEqual({
      provider: 'gemini',
      products: [
        {
          name: 'Remera Nike Negra',
          sku: null,
          barcode: null,
          brand: 'Nike',
          category: 'Remeras',
          size: 'M',
          color: 'Negro',
          description: null,
          price: 25000,
          stock: 10,
        },
      ],
    });
  });

  it('drops items with no usable name instead of throwing', () => {
    const result = parseExtractionResponse(
      JSON.stringify({ products: [{ name: '' }, { name: 'Lápiz' }] }),
      'openai',
    );
    expect(result.products).toEqual([
      expect.objectContaining({ name: 'Lápiz' }),
    ]);
  });

  it('coerces a negative or non-numeric price/stock to null rather than trusting it', () => {
    const result = parseExtractionResponse(
      JSON.stringify({
        products: [{ name: 'X', price: -5, stock: 'diez' }],
      }),
      'openai',
    );
    expect(result.products[0].price).toBeNull();
    expect(result.products[0].stock).toBeNull();
  });

  it('throws AiInvalidResponseError on malformed JSON', () => {
    expect(() => parseExtractionResponse('{not json', 'openai')).toThrow(
      AiInvalidResponseError,
    );
  });

  it('throws AiInvalidResponseError when "products" is missing or not an array', () => {
    expect(() => parseExtractionResponse('{}', 'openai')).toThrow(
      AiInvalidResponseError,
    );
    expect(() =>
      parseExtractionResponse('{"products":"nope"}', 'openai'),
    ).toThrow(AiInvalidResponseError);
  });

  it('throws AiInvalidResponseError on an empty/null response', () => {
    expect(() => parseExtractionResponse(null, 'openai')).toThrow(
      AiInvalidResponseError,
    );
  });

  it('returns an empty product list for {"products":[]} without throwing', () => {
    expect(parseExtractionResponse('{"products":[]}', 'gemini')).toEqual({
      provider: 'gemini',
      products: [],
    });
  });
});
