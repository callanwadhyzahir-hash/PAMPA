'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { BarcodeLabel } from './barcode-label';

const QUANTITY_PRESETS = [1, 2, 5, 10] as const;

interface PrintBarcodeLabelsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barcode: string;
  productName: string;
  sku: string;
  price: string;
}

/** Quantity + field-toggle dialog that prints a sheet of BarcodeLabel copies via window.print(). */
function PrintBarcodeLabelsDialog({
  open,
  onOpenChange,
  barcode,
  productName,
  sku,
  price,
}: PrintBarcodeLabelsDialogProps) {
  const [preset, setPreset] = useState<(typeof QUANTITY_PRESETS)[number] | 'custom'>(1);
  const [customQuantity, setCustomQuantity] = useState('1');
  const [showName, setShowName] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showPrice, setShowPrice] = useState(true);

  const quantity = Math.min(
    200,
    Math.max(1, preset === 'custom' ? Number(customQuantity) || 1 : preset),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Imprimir etiqueta</DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Cantidad</p>
            <div className="flex flex-wrap gap-2">
              {QUANTITY_PRESETS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={preset === value ? 'default' : 'outline'}
                  onClick={() => setPreset(value)}
                >
                  {value}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant={preset === 'custom' ? 'default' : 'outline'}
                onClick={() => setPreset('custom')}
              >
                Personalizada
              </Button>
            </div>
            {preset === 'custom' ? (
              <Input
                type="number"
                min="1"
                max="200"
                value={customQuantity}
                onChange={(event) => setCustomQuantity(event.target.value)}
              />
            ) : null}
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Incluir en la etiqueta</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showName}
                onChange={(event) => setShowName(event.target.checked)}
              />
              Nombre
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showSku}
                onChange={(event) => setShowSku(event.target.checked)}
              />
              SKU
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(event) => setShowPrice(event.target.checked)}
              />
              Precio
            </label>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <BarcodeLabel
              barcode={barcode}
              productName={productName}
              sku={sku}
              price={price}
              showName={showName}
              showSku={showSku}
              showPrice={showPrice}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => window.print()}>
            Imprimir {quantity > 1 ? `(${quantity})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
      {open
        ? createPortal(
            <div id="barcode-print-sheet" className="hidden print:block">
              <div className="flex flex-wrap gap-3 p-4">
                {Array.from({ length: quantity }, (_, index) => (
                  <BarcodeLabel
                    key={index}
                    barcode={barcode}
                    productName={productName}
                    sku={sku}
                    price={price}
                    showName={showName}
                    showSku={showSku}
                    showPrice={showPrice}
                  />
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </Dialog>
  );
}

export { PrintBarcodeLabelsDialog };
export type { PrintBarcodeLabelsDialogProps };
