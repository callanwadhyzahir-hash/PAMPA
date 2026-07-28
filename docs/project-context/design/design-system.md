# PAMPA UI — Sistema de diseño

## Propósito

PAMPA UI es la librería interna para pantallas operativas del ERP. Prioriza claridad, densidad de información razonable y consistencia para uso diario. No es una interfaz de marketing: evita gradientes, glassmorphism y ornamentos innecesarios.

## Colores

- Fondo: `#f8fafc` (`background`).
- Superficie: `#ffffff` (`surface`).
- Texto principal: `#111827` (`foreground`).
- Primario: `#2563eb`; se reserva para acciones principales, foco y enlaces relevantes.
- Texto secundario: `#6b7280` (`muted-foreground`).
- Bordes: `#e5e7eb` (`border`).
- Estados: éxito `#16a34a`, advertencia `#f59e0b`, error `#dc2626`.
- Navegación lateral: `#111827`, con acento `#1f2937`.

No se incorporan colores semánticos fuera de estos tokens sin una decisión de diseño.

## Tipografía

- Fuente de interfaz: Arial, Helvetica, sans-serif, definida mediante `--font-sans`.
- Texto base: 14 px (`text-sm`) para tablas y controles; 16 px para texto de lectura.
- Título de página: `text-xl` en móvil y `text-2xl` desde `sm`.
- Peso 500 para rótulos y 600 para jerarquías; no usar mayúsculas sostenidas como recurso de jerarquía.

## Espaciado

- Escala basada en múltiplos de 4 px de Tailwind.
- Página: 20 px en móvil y 32 px desde `sm`.
- Sección: 16 px entre encabezado y contenido.
- Formularios: 16 px entre controles y 20 px entre secciones.
- Toolbars: 8 px entre acciones relacionadas.

## Bordes y sombras

- Radio: 8 px para inputs, 12 px para contenedores pequeños y 16 px para cards y diálogos.
- Los contenedores usan borde sutil; las cards operativas no usan sombras pronunciadas.
- La elevación solo comunica superposición, como en diálogos.

## Botones

- `default`: una acción primaria por contexto.
- `outline`: acciones secundarias y navegación contextual.
- `ghost`: acciones de baja jerarquía.
- `destructive`: confirmaciones irreversibles.
- Tamaño base de 36 px, iconos de 16 px. Todos los iconos deben tener etiqueta accesible cuando el botón no contiene texto.

## Tablas

- Encabezados compactos y filas con separación por borde.
- Las tablas deben definir columnas explícitas y una clave estable por fila.
- La toolbar aloja búsqueda, filtros y acciones; la paginación se ubica al pie.
- Usar `DataTableLoading` durante carga y `DataTableEmpty` cuando no haya resultados; no mostrar tablas vacías sin contexto.

## Formularios

- Agrupar campos con `FormSection` y mantener dos columnas solo desde `sm`.
- Etiquetas claras, validación junto al campo y acciones alineadas al final.
- Los formularios de entidades se muestran dentro de `EntityDialog` cuando la tarea no requiere una página dedicada.

## Diálogos

- Un diálogo debe tener título y descripción que expliquen la consecuencia.
- La acción de cancelar se presenta antes de confirmar.
- `DeleteDialog` se reserva para acciones destructivas y debe recibir una etiqueta identificable del elemento.

## Estados de interfaz

- `LoadingState` y `DataTableLoading` comunican espera sin bloquear información no relacionada.
- `EmptyState` explica la ausencia de contenido y puede incluir una acción contextual.
- `ErrorState` comunica el problema sin exponer detalles técnicos al usuario final.
- `StatusBadge` combina texto y color; el color nunca es el único indicador de estado.

## Responsive

- Las acciones y toolbars hacen wrap en pantallas pequeñas.
- Formularios pasan de una a dos columnas desde `sm`.
- Las tablas conservan scroll horizontal dentro de su contenedor en lugar de ocultar datos.
- El contenido principal mantiene una anchura máxima de 1440 px.

## Accesibilidad

- Usar elementos semánticos: `main`, `header`, `section`, `fieldset`, `nav`, `table` y listas de definición.
- Mantener estados de foco visibles usando los tokens de `ring` existentes.
- Los diálogos usan las primitivas accesibles de Base UI.
- Los iconos decorativos usan `aria-hidden`; los controles de solo icono tienen `aria-label`.
- Mantener contraste suficiente y no depender solo del color para transmitir estados.
