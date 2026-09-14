import { ApiProperty } from '@nestjs/swagger';

export class ProfileInputDto {
  @ApiProperty({ description: 'Имя профиля', minLength: 1, maxLength: 100 })
  displayName!: string;
  @ApiProperty({
    description: 'Код основной валюты из /settings/options',
    example: 'RUB',
  })
  baseCurrency!: string;
  @ApiProperty({
    description: 'Часовой пояс IANA из /settings/options',
    example: 'Europe/Moscow',
  })
  timeZone!: string;
}
export class UserDto extends ProfileInputDto {
  @ApiProperty({
    description: 'Идентификатор текущего пользователя',
    format: 'uuid',
  })
  id!: string;
  @ApiProperty({ description: 'Нормализованный email', format: 'email' })
  email!: string;
  @ApiProperty({
    description:
      'Основная валюта заблокирована финансовыми данными или их историей',
  })
  baseCurrencyLocked!: boolean;
}
export class PreferenceOptionsDto {
  @ApiProperty({ description: 'Поддерживаемые коды валют', type: [String] })
  currencies!: string[];
  @ApiProperty({
    description: 'Поддерживаемые часовые пояса IANA',
    type: [String],
  })
  timeZones!: string[];
}
