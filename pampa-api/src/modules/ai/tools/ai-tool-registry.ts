import { Injectable } from '@nestjs/common';

import type { AiToolDefinition } from '../provider/ai-tool.interface';
import type { AiTool } from './ai-tool';

/**
 * Central catalog of every tool PAMPA IA may call. AiToolsRegistrar
 * populates this at boot (see ai-tools.registrar.ts) from real, existing
 * PAMPA services — nothing here talks to Prisma directly.
 *
 * register() is the single gate that makes "no mutating tool can sneak in
 * this sprint" a runtime guarantee, not just a convention: any tool missing
 * `readOnly: true` throws at boot instead of registering.
 */
@Injectable()
export class AiToolRegistry {
  private readonly tools = new Map<string, AiTool>();

  register(tool: AiTool): void {
    if (tool.readOnly !== true) {
      throw new Error(
        `AiToolRegistry: tool "${tool.name}" must declare readOnly: true — PAMPA IA cannot register a mutating tool this sprint.`,
      );
    }
    if (this.tools.has(tool.name)) {
      throw new Error(`AiToolRegistry: duplicate tool "${tool.name}".`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): AiTool | undefined {
    return this.tools.get(name);
  }

  list(): AiTool[] {
    return [...this.tools.values()];
  }

  toDefinitions(): AiToolDefinition[] {
    return this.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }
}
