import { ApiProperty } from '@nestjs/swagger';
import { ProfileInputDto } from '../users/user.dto.js';
export class LoginInputDto {
  @ApiProperty({
    description: 'Email, регистр не учитывается',
    format: 'email',
    maxLength: 254,
  })
  email!: string;
  @ApiProperty({
    description: 'Пароль',
    minLength: 1,
    maxLength: 128,
    writeOnly: true,
  })
  password!: string;
}
export class RegisterInputDto extends ProfileInputDto {
  @ApiProperty({
    description: 'Email нового пользователя',
    format: 'email',
    maxLength: 254,
  })
  email!: string;
  @ApiProperty({
    description: 'Пароль от 12 до 128 символов',
    minLength: 12,
    maxLength: 128,
    writeOnly: true,
  })
  password!: string;
}
