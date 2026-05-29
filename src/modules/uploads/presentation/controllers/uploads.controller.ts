import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';

import type { AuthenticatedMaria } from '../../../auth-maria/application/services/token-maria.service';
import { MariaUser } from '../../../auth-maria/presentation/decorators/maria-user.decorator';
import { JwtMariaGuard } from '../../../auth-maria/presentation/guards/jwt-maria.guard';
import { MinioService } from '../../application/services/minio.service';

class UploadResponseDto {
  @ApiProperty({ description: 'URL pública do arquivo no MinIO.' })
  url!: string;

  @ApiProperty({ description: 'Chave do objeto (path completo dentro do bucket).' })
  key!: string;
}

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(JwtMariaGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly minio: MinioService) {}

  @Post('encaminhamento')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Sobe a foto/PDF do encaminhamento médico.',
    description:
      'Recebe um arquivo (imagem ou PDF) e devolve a URL pública pra ' +
      'passar no campo `encaminhamentoUrl` ao criar uma solicitação. ' +
      'Tamanho máximo: 8 MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({ type: UploadResponseDto })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_SIZE } }))
  async encaminhamento(
    @MariaUser() user: AuthenticatedMaria,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_SIZE }),
          new FileTypeValidator({
            fileType: /^(image\/(jpe?g|png|webp|heic)|application\/pdf)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    if (!file?.buffer) {
      throw new BadRequestException('Arquivo não recebido.');
    }
    return this.minio.upload({
      prefixo: 'encaminhamentos',
      proprietarioId: user.usuarioMariaId,
      arquivo: file.buffer,
      nomeOriginal: file.originalname,
      mimeType: file.mimetype,
    });
  }

  @Post('perfil')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Sobe a foto de perfil do paciente.',
    description: 'Apenas imagens. Tamanho máximo: 8 MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOkResponse({ type: UploadResponseDto })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_SIZE } }))
  async perfil(
    @MariaUser() user: AuthenticatedMaria,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_SIZE }),
          new FileTypeValidator({ fileType: /^image\/(jpe?g|png|webp|heic)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    if (!file?.buffer) {
      throw new BadRequestException('Arquivo não recebido.');
    }
    return this.minio.upload({
      prefixo: 'perfis',
      proprietarioId: user.usuarioMariaId,
      arquivo: file.buffer,
      nomeOriginal: file.originalname,
      mimeType: file.mimetype,
    });
  }
}
