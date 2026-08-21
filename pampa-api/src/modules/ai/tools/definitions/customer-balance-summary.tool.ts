import { CLIENT_PERMISSIONS } from '../../../commercial/clients/client.permissions';
import type { AiTool } from '../ai-tool';
import type { AiToolsRepository } from '../ai-tools.repository';
import { asOptionalInt } from '../tool-args.util';

export function createCustomerBalanceSummaryTool(
  repository: AiToolsRepository,
): AiTool {
  return {
    name: 'get_customer_balance_summary',
    description:
      'Total por cobrar a clientes y el detalle de los clientes con mayor saldo pendiente.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description:
            'Cantidad de clientes a listar en el detalle (1-20). Por defecto 10.',
        },
      },
    },
    permission: CLIENT_PERMISSIONS.read,
    readOnly: true,
    handler: async (args, context) => {
      const limit = asOptionalInt(args, 'limit', {
        min: 1,
        max: 20,
        fallback: 10,
      });
      const summary = await repository.customerBalanceSummary(
        context.companyId,
        limit,
      );
      return summary;
    },
  };
}
