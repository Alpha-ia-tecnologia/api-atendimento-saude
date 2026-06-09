import { PutObjectCommand, S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

export type PrefixoUpload = 'perfis' | 'encaminhamentos' | 'comprovantes' | 'whatsapp';

interface UploadParams {
  prefixo: PrefixoUpload;
  proprietarioId: string;
  arquivo: Buffer;
  nomeOriginal: string;
  mimeType: string;
}

export interface UploadResultado {
  url: string;
  key: string;
}

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client!: S3Client;
  private bucket!: string;
  private endpoint!: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.endpoint = this.configService.getOrThrow<string>('MINIO_ENDPOINT').replace(/\/$/, '');
    this.bucket = this.configService.getOrThrow<string>('MINIO_BUCKET_NAME');

    this.client = new S3Client({
      endpoint: this.endpoint,
      region: this.configService.get<string>('MINIO_REGION', 'us-east-1'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
        secretAccessKey: this.configService.getOrThrow<string>('MINIO_SECRET_KEY'),
      },
    });
    this.logger.log(`MinIO conectado em ${this.endpoint}/${this.bucket}`);
  }

  async upload({
    prefixo,
    proprietarioId,
    arquivo,
    nomeOriginal,
    mimeType,
  }: UploadParams): Promise<UploadResultado> {
    const ext = this.extensao(nomeOriginal, mimeType);
    const key = `${prefixo}/${proprietarioId}/${Date.now()}-${randomUUID()}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: arquivo,
        ContentType: mimeType,
      }),
    );

    return { url: this.urlPublica(key), key };
  }

  /**
   * Baixa o objeto inteiro como Buffer. Usado pra análise local (OCR) —
   * a foto já subiu pelo /uploads, aqui recuperamos os bytes pelo `key`.
   */
  async baixarBytes(key: string, timeoutMs = 15_000): Promise<Buffer> {
    // Timeout aborta um download pendurado (rede/MinIO fora) — sem ele, a request
    // do webhook (e o OCR) ficaria presa indefinidamente. O caller faz fail-open.
    const resposta = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { abortSignal: AbortSignal.timeout(timeoutMs) },
    );
    const bytes = await resposta.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }

  /**
   * Gera URL pré-assinada GET. Funciona em bucket privado E público.
   * Default 1h — tempo que o usuário fica vendo a tela.
   */
  async presignedGetUrl(key: string, expiraEmSegundos = 60 * 60): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiraEmSegundos,
    });
  }

  /**
   * Recebe uma URL salva no banco (que pode ser nossa, do MinIO, OU externa)
   * e devolve uma URL acessível pelo cliente.
   * - URL do nosso MinIO → presigned URL temporária
   * - URL externa (CDN/etc) → passa direto
   * - null → null
   */
  async assinarUrlDeArquivo(
    url: string | null | undefined,
    expiraEmSegundos = 60 * 60,
  ): Promise<string | null> {
    if (!url) return null;
    const key = this.extrairKeyDeUrl(url);
    if (!key) return url; // URL externa — repassa
    try {
      return await this.presignedGetUrl(key, expiraEmSegundos);
    } catch (err) {
      this.logger.error(`Falha ao assinar ${key}: ${(err as Error).message}`);
      return url; // fallback — devolve a URL crua, se o bucket for público funciona
    }
  }

  /**
   * Extrai a chave (path interno do bucket) de uma URL pública do nosso MinIO.
   * Retorna null se a URL não for do nosso endpoint+bucket.
   */
  extrairKeyDeUrl(url: string): string | null {
    const prefix = `${this.endpoint}/${this.bucket}/`;
    if (!url.startsWith(prefix)) return null;
    return decodeURI(url.slice(prefix.length));
  }

  private urlPublica(key: string): string {
    return `${this.endpoint}/${this.bucket}/${encodeURI(key)}`;
  }

  private extensao(nome: string, mime: string): string {
    const matchNome = /\.([a-z0-9]+)$/i.exec(nome);
    if (matchNome) return `.${matchNome[1].toLowerCase()}`;
    const mapaMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/heic': '.heic',
      'application/pdf': '.pdf',
    };
    return mapaMime[mime] ?? '';
  }
}
