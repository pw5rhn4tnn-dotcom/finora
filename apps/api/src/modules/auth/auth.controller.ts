import { AuthRateLimit } from './security.guard.js';
import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { User } from '../../generated/prisma/client.js';
import { ApiProblems } from '../../common/api-problems.js';
import { UsersService } from '../users/users.service.js';
import { UserDto } from '../users/user.dto.js';
import { loginSchema, registerSchema, validate } from '../users/preferences.js';
import { AuthService } from './auth.service.js';
import { CurrentUser, Public } from './auth.guard.js';
import { LoginInputDto, RegisterInputDto } from './auth.dto.js';
import { SessionService } from './session.service.js';

@ApiTags('Авторизация')
@ApiProblems()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly users: UsersService,
  ) {}
  @Public()
  @AuthRateLimit('register')
  @Post('register')
  @ApiOperation({
    operationId: 'authRegister',
    summary: 'Создать аккаунт, стандартные категории и сессию',
  })
  @ApiBody({ type: RegisterInputDto })
  @ApiCreatedResponse({ type: UserDto })
  async register(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.auth.register(validate(registerSchema, body));
    response.setHeader(
      'Set-Cookie',
      this.sessions.cookie(await this.sessions.sign(user.id)),
    );
    return user;
  }
  @Public()
  @AuthRateLimit('login')
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'authLogin',
    summary: 'Войти по email и паролю',
  })
  @ApiBody({ type: LoginInputDto })
  @ApiOkResponse({ type: UserDto })
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.auth.login(validate(loginSchema, body));
    response.setHeader(
      'Set-Cookie',
      this.sessions.cookie(await this.sessions.sign(user.id)),
    );
    return user;
  }
  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({
    operationId: 'authLogout',
    summary:
      'Удалить cookie текущего браузера; ранее скопированный JWT действует до истечения 24 часов',
  })
  @ApiNoContentResponse({
    description: 'Cookie удалена, в том числе для истёкшей сессии',
  })
  logout(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Set-Cookie', this.sessions.cookie('', true));
  }
  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({
    operationId: 'authMe',
    summary: 'Получить текущего пользователя из JWT cookie',
  })
  @ApiOkResponse({ type: UserDto })
  me(@CurrentUser() user: User) {
    return this.users.view(user);
  }
}
