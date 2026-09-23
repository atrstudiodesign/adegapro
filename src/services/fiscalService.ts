import { Sale, Store } from '../types';
import { db } from './db';

export class FiscalService {
  /**
   * Generates a 44-digit Brazilian SEFAZ Access Key (Chave de Acesso)
   * Formula: cUF (2) + AAMM (4) + CNPJ (14) + mod (2) + serie (3) + nNF (9) + tpEmis (1) + cNF (8) + cDV (1)
   */
  public generateAccessKey(sale: Sale, store: Store): string {
    const cUF = '35'; // São Paulo
    const now = new Date(sale.createdAt);
    const aa = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const cleanCnpj = store.cnpj.replace(/\D/g, '').padStart(14, '0');
    const mod = '65'; // 65 = NFC-e (Nota Fiscal de Consumidor Eletrônica)
    const serie = '001';
    const nNF = String(sale.saleNumber).padStart(9, '0');
    const tpEmis = '1'; // Emissão Normal
    const cNF = String(Math.floor(10000000 + Math.random() * 90000000)); // Código Numérico Aleatório

    const baseKey = `${cUF}${aa}${mm}${cleanCnpj}${mod}${serie}${nNF}${tpEmis}${cNF}`;
    
    // Calculate modulo 11 check digit (DV)
    let sum = 0;
    let weight = 2;
    for (let i = baseKey.length - 1; i >= 0; i--) {
      sum += parseInt(baseKey.charAt(i), 10) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    const remainder = sum % 11;
    const dv = (remainder === 0 || remainder === 1) ? 0 : 11 - remainder;

    return `${baseKey}${dv}`;
  }

  /**
   * Formats XML representation conforming to NFC-e / SEFAZ standards
   */
  public buildNFCeXml(sale: Sale, store: Store, accessKey: string): string {
    const itemsXml = sale.items.map((item, idx) => `
      <det nItem="${idx + 1}">
        <prod>
          <cProd>${item.productId}</cProd>
          <cEAN>${item.barcode || 'SEM GTIN'}</cEAN>
          <xProd>${item.productName.replace(/&/g, '&amp;')}</xProd>
          <NCM>22030000</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>${item.quantity.toFixed(4)}</qCom>
          <vUnCom>${item.unitPrice.toFixed(4)}</vUnCom>
          <vProd>${item.subtotal.toFixed(2)}</vProd>
          <vDesc>${item.discount.toFixed(2)}</vDesc>
          <cEANTrib>${item.barcode || 'SEM GTIN'}</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>${item.quantity.toFixed(4)}</qTrib>
          <vUnTrib>${item.unitPrice.toFixed(4)}</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMSSN102>
              <orig>0</orig>
              <CSOSN>102</CSOSN>
            </ICMSSN102>
          </ICMS>
        </imposto>
      </det>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${accessKey}" versao="4.00">
    <ide>
      <cUF>35</cUF>
      <cNF>${accessKey.substring(35, 43)}</cNF>
      <natOp>VENDA DE MERCADORIA</natOp>
      <mod>65</mod>
      <serie>1</serie>
      <nNF>${sale.saleNumber}</nNF>
      <dhEmi>${sale.createdAt}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>3550308</cMunFG>
      <tpImp>4</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${accessKey.slice(-1)}</cDV>
      <tpAmb>2</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verProc>1.0.0</verProc>
    </ide>
    <emit>
      <CNPJ>${store.cnpj.replace(/\D/g, '')}</CNPJ>
      <xNome>${store.name.replace(/&/g, '&amp;')}</xNome>
      <xFant>${store.tradeName.replace(/&/g, '&amp;')}</xFant>
      <enderEmit>
        <xLgr>${store.address.replace(/&/g, '&amp;')}</xLgr>
        <nro>1200</nro>
        <xBairro>Centro</xBairro>
        <cMun>3550308</cMun>
        <xMun>${store.city}</xMun>
        <UF>${store.state}</UF>
        <CEP>${store.zipCode.replace(/\D/g, '')}</CEP>
        <cPais>1058</cPais>
        <xPais>Brasil</xPais>
        <fone>${store.phone.replace(/\D/g, '')}</fone>
      </enderEmit>
      <IE>${store.stateRegistration.replace(/\D/g, '')}</IE>
      <CRT>1</CRT>
    </emit>
    ${itemsXml}
    <total>
      <ICMSTot>
        <vBC>0.00</vBC>
        <vICMS>0.00</vICMS>
        <vProd>${sale.subtotal.toFixed(2)}</vProd>
        <vDesc>${sale.discount.toFixed(2)}</vDesc>
        <vNF>${sale.total.toFixed(2)}</vNF>
      </ICMSTot>
    </total>
    <pag>
      <detPag>
        <tPag>01</tPag>
        <vPag>${sale.total.toFixed(2)}</vPag>
      </detPag>
    </pag>
  </infNFe>
</NFe>`;
  }

  public getFiscalStatus() {
    const config = db.getIntegrations().fiscal;
    return {
      enabled: config.enabled,
      status: config.status,
      model: config.model,
      environment: config.environment,
      message: config.status === 'PENDING_CERTIFICATE'
        ? 'Módulo Fiscal aguardando upload do Certificado Digital A1 (.pfx) e token CSC da SEFAZ para transmissão em tempo real.'
        : 'Módulo Fiscal homologado e pronto para emissão.'
    };
  }
}

export const fiscalService = new FiscalService();
