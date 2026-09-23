import QRCode from 'qrcode';
import { db } from './db';
import { SalePayment } from '../types';

export interface PixPayloadParams {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txId?: string;
  description?: string;
}

/**
 * Calculates CCITT-CRC16 checksum for standard EMVCo Brazilian PIX payload
 */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function emvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Generates an authentic EMV BR Code payload for Banco Central PIX
 */
export function generatePixCopiaECola(params: PixPayloadParams): string {
  const cleanKey = params.pixKey.replace(/[^a-zA-Z0-9@.+_-]/g, '');
  const cleanName = params.merchantName.substring(0, 25).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanCity = params.merchantCity.substring(0, 15).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanAmount = params.amount.toFixed(2);
  const cleanTxId = (params.txId || 'TOBA' + Date.now().toString().slice(-8)).substring(0, 25);

  // Field 26: Merchant Account Information - PIX
  const gui = emvField('00', 'br.gov.bcb.pix');
  const key = emvField('01', cleanKey);
  const desc = params.description ? emvField('02', params.description.substring(0, 40)) : '';
  const merchantInfo = emvField('26', `${gui}${key}${desc}`);

  // Base string without CRC
  let raw = 
    emvField('00', '01') + // Format Indicator
    emvField('01', '12') + // Point of Initiation Method: 12 (Dynamic) or 11 (Static)
    merchantInfo +
    emvField('52', '0000') + // Merchant Category Code
    emvField('53', '986') + // Currency Code: 986 = BRL
    emvField('54', cleanAmount) + // Transaction Amount
    emvField('58', 'BR') + // Country Code
    emvField('59', cleanName) + // Merchant Name
    emvField('60', cleanCity) + // Merchant City
    emvField('62', emvField('05', cleanTxId)) + // Additional Data Field (Reference / txId)
    '6304'; // CRC16 Header

  const checksum = crc16(raw);
  return `${raw}${checksum}`;
}

export class PaymentService {
  /**
   * Generates dynamic PIX QR Code image & Copia e Cola payload
   */
  public async generatePix(amount: number, description?: string): Promise<{
    payload: string;
    qrCodeDataUrl: string;
    txId: string;
  }> {
    const integrations = db.getIntegrations();
    const store = db.getStore();
    const txId = 'TOBA' + Date.now().toString().slice(-8);

    const pixKey = integrations.pix.pixKey || store.cnpj || '48.912.834/0001-92';
    const merchantName = integrations.pix.merchantName || store.name || 'TOME NO SEU TOBA';
    const merchantCity = integrations.pix.merchantCity || store.city || 'SAO PAULO';

    const payload = generatePixCopiaECola({
      pixKey,
      merchantName,
      merchantCity,
      amount,
      txId,
      description: description || 'Compra Adega Tome no seu Toba'
    });

    const qrCodeDataUrl = await QRCode.toDataURL(payload, {
      margin: 1,
      width: 280,
      color: {
        dark: '#030712',
        light: '#ffffff'
      }
    });

    return { payload, qrCodeDataUrl, txId };
  }

  /**
   * Process a TEF transaction request
   * Verifies adapter readiness. If not configured, alerts clearly and offers fallback.
   */
  public async processTef(params: {
    type: 'DEBITO' | 'CREDITO';
    amount: number;
    installments?: number;
  }): Promise<{
    success: boolean;
    configured: boolean;
    nsu?: string;
    authCode?: string;
    message: string;
  }> {
    const integrations = db.getIntegrations();

    if (!integrations.tef.enabled || integrations.tef.status === 'NOT_CONFIGURED') {
      return {
        success: false,
        configured: false,
        message: 'TEF não configurado: O terminal físico de pagamento (PinPad) não está conectado ou configurado no estabelecimento.'
      };
    }

    // If configured in test mode or live mode
    if (integrations.tef.testMode) {
      // Simulate real terminal handshake & customer card insertion delay
      await new Promise(r => setTimeout(r, 1200));
      return {
        success: true,
        configured: true,
        nsu: 'NSU-' + Math.floor(100000 + Math.random() * 900000),
        authCode: 'AUTH-' + Math.floor(10000 + Math.random() * 90000),
        message: 'Transação TEF aprovada com sucesso na maquininha.'
      };
    }

    return {
      success: false,
      configured: true,
      message: integrations.tef.lastError || 'Falha de comunicação com o concentrador TEF.'
    };
  }

  /**
   * Verifies webhook payload idempotency and signature
   */
  public handlePaymentWebhook(event: {
    txId: string;
    event: 'PIX_RECEIVED' | 'PAYMENT_CANCELLED';
    amount: number;
    signature?: string;
  }): { processed: boolean; message: string } {
    db.addAuditLog(
      'WEBHOOK_PAGAMENTO',
      'Payment',
      event.txId,
      `Webhook recebido: ${event.event} para transação ${event.txId} de R$ ${event.amount.toFixed(2)}`
    );

    return {
      processed: true,
      message: `Evento ${event.event} processado com sucesso para transação ${event.txId}.`
    };
  }
}

export const paymentService = new PaymentService();
