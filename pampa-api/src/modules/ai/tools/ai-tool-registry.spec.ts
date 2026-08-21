import type { AiTool } from './ai-tool';
import { AiToolRegistry } from './ai-tool-registry';

function makeTool(overrides: Partial<AiTool> = {}): AiTool {
  return {
    name: 'search_products',
    description: 'Busca productos.',
    inputSchema: { type: 'object', properties: {} },
    permission: 'products.read',
    readOnly: true,
    handler: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe('AiToolRegistry', () => {
  it('registers a well-formed read-only tool and returns it by name', () => {
    const registry = new AiToolRegistry();
    const tool = makeTool();

    registry.register(tool);

    expect(registry.get('search_products')).toBe(tool);
    expect(registry.list()).toEqual([tool]);
  });

  it('refuses to register a tool that is not declared readOnly: true', () => {
    const registry = new AiToolRegistry();
    const mutatingTool = {
      ...makeTool(),
      readOnly: false,
    } as unknown as AiTool;

    expect(() => registry.register(mutatingTool)).toThrow(/readOnly/);
    expect(registry.get('search_products')).toBeUndefined();
  });

  it('refuses to register two tools with the same name', () => {
    const registry = new AiToolRegistry();
    registry.register(makeTool());

    expect(() => registry.register(makeTool())).toThrow(/duplicate/i);
  });

  it('toDefinitions() exposes only the provider-facing shape (name/description/inputSchema), never the handler or permission', () => {
    const registry = new AiToolRegistry();
    registry.register(makeTool());

    const definitions = registry.toDefinitions();

    expect(definitions).toEqual([
      {
        name: 'search_products',
        description: 'Busca productos.',
        inputSchema: { type: 'object', properties: {} },
      },
    ]);
    expect(JSON.stringify(definitions)).not.toContain('permission');
  });
});
