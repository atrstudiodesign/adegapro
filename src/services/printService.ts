import QRCode from 'qrcode';
import { Sale, Store } from '../types';

export class PrintService {
  /**
   * Generates QR Code Data URL for digital receipt link
   */
  public async generateReceiptQrCode(receiptUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(receiptUrl, {
        margin: 1,
        width: 140,
        color: { dark: '#000000', light: '#ffffff' }
      });
    } catch (e) {
      console.error('Error generating receipt QR code', e);
      return '';
    }
  }

  /**
   * Generates formatted ESC/POS monospaced text representation for thermal printer logs
   */
  public formatThermalText(sale: Sale, store: Store, width: '58mm' | '80mm' = '80mm'): string {
    const colWidth = width === '58mm' ? 32 : 48;
    const line = '-'.repeat(colWidth);
    const doubleLine = '='.repeat(colWidth);

    const pad = (left: string, right: string) => {
      const space = colWidth - left.length - right.length;
      return left + ' '.repeat(Math.max(1, space)) + right;
    };

    const center = (text: string) => {
      const padLen = Math.max(0, Math.floor((colWidth - text.length) / 2));
      return ' '.repeat(padLen) + text;
    };

    const lines: string[] = [
      center('================================'),
      center('*** TOME NO SEU TOBA ***'),
      center('ADEGA & CONVENIENCIA'),
      center(store.name),
      center(`CNPJ: ${store.cnpj}`),
      center(store.address),
      center(`Tel/Zap: ${store.phone}`),
      doubleLine,
      pad(`CUPOM NAO FISCAL #${sale.saleNumber}`, new Date(sale.createdAt).toLocaleDateString('pt-BR')),
      pad(`HORA: ${new Date(sale.createdAt).toLocaleTimeString('pt-BR')}`, `OPERADOR: ${sale.cashierName.split(' ')[0]}`),
      line,
      width === '58mm' ? 'ITEM        QTD x UN     TOTAL' : 'ITEM DESC             QTD  x  UNIT        TOTAL',
      line
    ];

    sale.items.forEach((item, index) => {
      const idx = String(index + 1).padStart(2, '0');
      const name = item.productName.length > 20 ? item.productName.substring(0, 18) + '..' : item.productName;
      const unit = `R$ ${item.unitPrice.toFixed(2)}`;
      const total = `R$ ${item.subtotal.toFixed(2)}`;
      
      lines.push(`${idx}. ${name}`);
      lines.push(pad(`   ${item.quantity} un x ${unit}`, total));
    });

    lines.push(line);
    lines.push(pad('SUBTOTAL:', `R$ ${sale.subtotal.toFixed(2)}`));
    if (sale.discount > 0) {
      lines.push(pad('DESCONTO:', `-R$ ${sale.discount.toFixed(2)}`));
    }
    if (sale.surcharge > 0) {
      lines.push(pad('ACRESCIMO:', `+R$ ${sale.surcharge.toFixed(2)}`));
    }
    lines.push(doubleLine);
    lines.push(pad('VALOR TOTAL:', `R$ ${sale.total.toFixed(2)}`));
    lines.push(doubleLine);

    lines.push('FORMAS DE PAGAMENTO:');
    sale.payments.forEach(p => {
      const methodLabel = p.method === 'DINHEIRO' ? 'Dinheiro' : p.method;
      lines.push(pad(`- ${methodLabel}`, `R$ ${p.amount.toFixed(2)}`));
      if (p.change && p.change > 0) {
        lines.push(pad('  Troco:', `R$ ${p.change.toFixed(2)}`));
      }
    });

    if (sale.customerName) {
      lines.push(line);
      lines.push(`CLIENTE: ${sale.customerName}`);
    }

    lines.push(line);
    lines.push(center(store.receiptFooter || 'Obrigado pela preferencia!'));
    lines.push(center(`Comprovante Digital: ${sale.digitalReceiptId}`));
    lines.push(center('================================'));

    return lines.join('\n');
  }

  /**
   * Triggers native thermal printing dialog
   */
  public printReceipt() {
    window.print();
  }
}

export const printService = new PrintService();
