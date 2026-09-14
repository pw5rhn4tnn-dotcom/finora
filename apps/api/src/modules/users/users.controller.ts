import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { User } from '../../generated/prisma/client.js';
import { ApiProblems } from '../../common/api-problems.js';
import { CurrentUser, Public } from '../auth/auth.guard.js';
import {
  currencies,
  timeZones,
  profileSchema,
  validate,
} from './preferences.js';
import { PreferenceOptionsDto, ProfileInputDto, UserDto } from './user.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Настройки')
@ApiProblems()
@Controller('settings')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Public()
  @Get('options')
  @ApiOperation({
    operationId: 'settingsOptions',
    summary: 'Каталог валют и часовых поясов для регистрации и настроек',
  })
  @ApiOkResponse({ type: PreferenceOptionsDto })
  options(): PreferenceOptionsDto {
    return { currencies, timeZones };
  }
  @Get()
  @ApiCookieAuth()
  @ApiOperation({
    operationId: 'settingsGet',
    summary: 'Получить свой профиль и настройки',
  })
  @ApiOkResponse({ type: UserDto })
  get(@CurrentUser() user: User) {
    return this.users.view(user);
  }
  @Patch()
  @ApiCookieAuth()
  @ApiOperation({
    operationId: 'settingsUpdate',
    summary:
      'Изменить имя, валюту и часовой пояс своего профиля; чужие ID запрещены',
  })
  @ApiBody({ type: ProfileInputDto })
  @ApiOkResponse({ type: UserDto })
  update(@CurrentUser() user: User, @Body() body: unknown) {
    return this.users.update(user.id, validate(profileSchema, body));
  }
}
