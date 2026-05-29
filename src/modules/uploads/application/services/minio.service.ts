import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

export type PrefixoUpload = 'perfis' | 'encaminhamentos' | 'comprovantes';

interface UploadParams {
  prefixo: PrefixoUpload;
  /** Subpasta lógica (usuarioId, solicitacaoId, etc). */
  proprietarioId: string;
  arquivo: Buffer;
  /** Nome original do arquivo (usado pra detectar extensão). */
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
    this.endpoint = this.configService
      .getOrThrow<string>('MINIO_ENDPOINT')
      .replace(/\/$/, '');
    this.bucket = this.configService.getOrThrow<string>('MINIO_BUCKET_NAME');

    this.client = new S3Client({
      endpoint: this.endpoint,
      region: this.configService.get<string>('MINIO_REGION', 'us-east-1'),
      forcePathStyle: true, // MinIO usa path-style por padrão
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
   * Gera uma URL temporária pra download (útil pra bucket privado).
   * Pra MVP com bucket público a urlPublica já basta.
   */
  async presignedGetUrl(key: string, expiraEmSegundos = 60 * 60): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiraEmSegundos },
    );
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
