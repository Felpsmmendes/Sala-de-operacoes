/**
 * Gerador de payload PIX ("BR Code" / Copia e Cola) — implementação direta
 * da especificação EMV QR Code estendida pelo Banco Central pro PIX. Não
 * depende de nenhuma API externa nem chave de banco/PSP: é só formatação de
 * texto + checksum, o mesmo que qualquer banco gera pra um QR estático.
 * Referência: manual "BR Code" do BCB (arranjo Pix), campos:
 *   00 payload format · 26 info da conta PIX (00 GUI, 01 chave, 02 descrição)
 *   52 MCC · 53 moeda (986=BRL) · 54 valor · 58 país · 59 nome · 60 cidade
 *   62 dados adicionais (05 txid) · 63 CRC16
 */

function campo(id: string, valor: string): string {
  const tamanho = valor.length.toString().padStart(2, '0');
  return `${id}${tamanho}${valor}`;
}

const REGEX_DIACRITICOS = /[̀-ͯ]/g;
const REGEX_NAO_ALFANUMERICO = /[^A-Za-z0-9 ]/g;

function normalizar(texto: string, tamanhoMax: number): string {
  return texto
    .normalize('NFD')
    .replace(REGEX_DIACRITICOS, '') // remove acentos — o padrão BR Code só aceita ASCII
    .replace(REGEX_NAO_ALFANUMERICO, '')
    .toUpperCase()
    .slice(0, tamanhoMax);
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export type DadosPix = {
  chave: string; // chave PIX do recebedor (CPF/CNPJ/e-mail/telefone/aleatória)
  nomeRecebedor: string;
  cidade: string;
  valor: number; // em reais, ex: 1530.00
  txid: string; // identificador da cobrança (ex: "CTR1234"), só A-Z 0-9, até 25 chars
};

/** Monta o payload "Copia e Cola" — string pronta pra virar QR Code ou ser colada no app do banco. */
export function montarPayloadPix({ chave, nomeRecebedor, cidade, valor, txid }: DadosPix): string {
  const infoConta = campo('00', 'br.gov.bcb.pix') + campo('01', chave);
  const merchantAccountInfo = campo('26', infoConta);

  const txidLimpo = (txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const dadosAdicionais = campo('62', campo('05', txidLimpo));

  const semCrc =
    campo('00', '01') +
    merchantAccountInfo +
    campo('52', '0000') +
    campo('53', '986') +
    campo('54', valor.toFixed(2)) +
    campo('58', 'BR') +
    campo('59', normalizar(nomeRecebedor, 25) || 'EM CENA EVENTOS') +
    campo('60', normalizar(cidade, 15) || 'SAO PAULO') +
    dadosAdicionais +
    '6304';

  return semCrc + crc16(semCrc);
}
