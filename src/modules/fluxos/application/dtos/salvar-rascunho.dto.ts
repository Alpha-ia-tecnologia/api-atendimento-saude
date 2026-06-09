import { ApiProperty } from '@nestjs/swagger';
import { CanalFluxo, TipoNoFluxo, TipoVariavelFluxo } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class NoInputDto {
  @ApiProperty({ example: 'menu' })
  @IsString()
  @MaxLength(120)
  chave!: string;

  @ApiProperty({ enum: TipoNoFluxo })
  @IsEnum(TipoNoFluxo)
  tipo!: TipoNoFluxo;

  @ApiProperty({ type: Object })
  @IsObject()
  conteudo!: Record<string, unknown>;

  @ApiProperty()
  @IsInt()
  posicaoX!: number;

  @ApiProperty()
  @IsInt()
  posicaoY!: number;

  @ApiProperty()
  @IsBoolean()
  ehInicial!: boolean;
}

export class ArestaInputDto {
  @ApiProperty({ example: 'menu' })
  @IsString()
  @MaxLength(120)
  origemChave!: string;

  @ApiProperty({ example: 'esp-consulta' })
  @IsString()
  @MaxLength(120)
  destinoChave!: string;

  @ApiProperty({ type: Object, example: { tipo: 'opcao', valor: 'agendar-consulta' } })
  @IsObject()
  condicao!: Record<string, unknown>;

  @ApiProperty()
  @IsInt()
  ordem!: number;
}

export class VariavelInputDto {
  @ApiProperty({ example: 'nome' })
  @IsString()
  @MaxLength(120)
  chave!: string;

  @ApiProperty({ example: 'Nome completo' })
  @IsString()
  @MaxLength(200)
  rotulo!: string;

  @ApiProperty({ enum: TipoVariavelFluxo })
  @IsEnum(TipoVariavelFluxo)
  tipo!: TipoVariavelFluxo;

  @ApiProperty()
  @IsBoolean()
  obrigatoria!: boolean;
}

export class SalvarRascunhoDto {
  @ApiProperty({ enum: CanalFluxo, default: CanalFluxo.WEB_APP })
  @IsEnum(CanalFluxo)
  canal!: CanalFluxo;

  @ApiProperty({ type: [NoInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoInputDto)
  nos!: NoInputDto[];

  @ApiProperty({ type: [ArestaInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArestaInputDto)
  arestas!: ArestaInputDto[];

  @ApiProperty({ type: [VariavelInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariavelInputDto)
  variaveis!: VariavelInputDto[];
}
