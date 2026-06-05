import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.development;

  @IsNumberString()
  PORT: string = '3000';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsString()
  AUTH_SINGLE_SESSION: string = 'true';

  @IsNumberString()
  BCRYPT_SALT_ROUNDS: string = '10';

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  // ---- MinIO ----
  @IsString()
  @IsNotEmpty()
  MINIO_ENDPOINT!: string;

  @IsString()
  @IsNotEmpty()
  MINIO_ACCESS_KEY!: string;

  @IsString()
  @IsNotEmpty()
  MINIO_SECRET_KEY!: string;

  @IsString()
  @IsNotEmpty()
  MINIO_BUCKET_NAME!: string;

  /** Tipicamente 'us-east-1' pra MinIO. */
  @IsString()
  @IsOptional()
  MINIO_REGION: string = 'us-east-1';

  // ---- OCR de triagem do encaminhamento (Tesseract) ----
  /** Liga/desliga a verificação OCR da foto do encaminhamento (kill-switch). */
  @IsString()
  @IsOptional()
  OCR_HABILITADO: string = 'true';

  /** Tentativas reprovadas antes de liberar a foto marcada pra revisão manual. */
  @IsNumberString()
  @IsOptional()
  OCR_MAX_TENTATIVAS: string = '3';

  /** Confiança média mínima do OCR (0-100) pra considerar a foto legível. */
  @IsNumberString()
  @IsOptional()
  OCR_CONF_MIN: string = '50';

  /** Mínimo de caracteres úteis (sem espaços) reconhecidos. */
  @IsNumberString()
  @IsOptional()
  OCR_MIN_CHARS: string = '25';

  /** Mínimo de palavras com boa confiança reconhecidas. */
  @IsNumberString()
  @IsOptional()
  OCR_MIN_PALAVRAS: string = '6';

  // ---- Integrações WhatsApp (Evolution / Meta Cloud) ----
  /**
   * Chave secreta para cifrar as credenciais dos provedores em repouso
   * (AES-256-GCM). Opcional no boot — a tela de Integrações só exige quando
   * for salvar/ler credenciais (erro claro se ausente nesse momento).
   */
  @IsString()
  @IsOptional()
  ENCRYPTION_KEY?: string;

  /**
   * URL pública do backend (ex.: https://api.seu-dominio.com). Usada para
   * montar a URL do webhook do WhatsApp exibida no CRM. Se ausente, o CRM
   * prefixa o caminho relativo com a origem que conhece.
   */
  @IsString()
  @IsOptional()
  PUBLIC_BASE_URL?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.toString()}`);
  }
  return validated;
}
