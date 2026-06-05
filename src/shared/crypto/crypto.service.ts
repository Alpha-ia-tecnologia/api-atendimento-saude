import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Cifragem simétrica AES-256-GCM para segredos em repouso (ex.: credenciais
 * dos provedores de WhatsApp). A chave de 32 bytes é derivada da env
 * `ENCRYPTION_KEY` via SHA-256, então qualquer passphrase serve.
 *
 * Formato do blob retornado: `base64(iv):base64(authTag):base64(ciphertext)`.
 *
 * A chave é opcional no boot — se faltar, qualquer chamada de encrypt/decrypt
 * lança erro claro (a tela de Integrações exige a chave; o resto do app sobe
 * normalmente sem ela).
 */
@Injectable()
export class CryptoService {
  private static readonly ALGORITMO = 'aes-256-gcm';
  private static readonly IV_BYTES = 12; // recomendado para GCM

  constructor(private readonly configService: ConfigService) {}

  /** True se `ENCRYPTION_KEY` está configurada (sem lançar). */
  disponivel(): boolean {
    return !!this.configService.get<string>('ENCRYPTION_KEY')?.trim();
  }

  /** Deriva a chave de 32 bytes ou lança se `ENCRYPTION_KEY` não foi definida. */
  private obterChave(): Buffer {
    const segredo = this.configService.get<string>('ENCRYPTION_KEY')?.trim();
    if (!segredo) {
      throw new InternalServerErrorException(
        'ENCRYPTION_KEY não configurada no servidor — necessária para salvar/ler credenciais de integração.',
      );
    }
    return createHash('sha256').update(segredo).digest(); // 32 bytes
  }

  /** Cifra um texto puro. Retorna o blob `iv:tag:ciphertext` em base64. */
  encrypt(textoPuro: string): string {
    const chave = this.obterChave();
    const iv = randomBytes(CryptoService.IV_BYTES);
    const cipher = createCipheriv(CryptoService.ALGORITMO, chave, iv);
    const cifrado = Buffer.concat([cipher.update(textoPuro, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('base64'), authTag.toString('base64'), cifrado.toString('base64')].join(
      ':',
    );
  }

  /** Decifra um blob produzido por `encrypt`. Lança se adulterado/ inválido. */
  decrypt(blob: string): string {
    const chave = this.obterChave();
    const partes = blob.split(':');
    if (partes.length !== 3) {
      throw new InternalServerErrorException('Blob cifrado em formato inválido.');
    }
    const [ivB64, tagB64, dadosB64] = partes;
    try {
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(tagB64, 'base64');
      const cifrado = Buffer.from(dadosB64, 'base64');
      const decipher = createDecipheriv(CryptoService.ALGORITMO, chave, iv);
      decipher.setAuthTag(authTag);
      const puro = Buffer.concat([decipher.update(cifrado), decipher.final()]);
      return puro.toString('utf8');
    } catch {
      throw new InternalServerErrorException(
        'Falha ao decifrar credenciais (chave incorreta ou dado corrompido).',
      );
    }
  }
}
