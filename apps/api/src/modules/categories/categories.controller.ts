import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { User } from '../../generated/prisma/client.js';
import { ApiProblems } from '../../common/api-problems.js';
import { CurrentUser } from '../auth/auth.guard.js';
import { validate } from '../users/preferences.js';
import {
  idSchema,
  categoryQuery,
  categorySchema,
  categoryPatch,
} from '../finance/validation.js';
import {
  CategoryDto,
  CategoryInputDto,
  CategoryPatchDto,
  CategoryQueryDto,
  CategoryPageDto,
  CategoryRemovalDto,
} from '../finance/finance.dto.js';
import { CategoriesService } from './categories.service.js';
@ApiTags('Категории')
@ApiCookieAuth()
@ApiProblems()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}
  @Get()
  @ApiOperation({
    operationId: 'categoriesList',
    summary: 'Список собственных записей с серверной пагинацией',
  })
  @ApiOkResponse({ type: CategoryPageDto })
  list(@CurrentUser() user: User, @Query() query: CategoryQueryDto) {
    return this.service.list(user.id, validate(categoryQuery, query));
  }

  @Get('options')
  @ApiOperation({
    operationId: 'categoriesOptions',
    summary:
      'Собственный компактный справочник для выбора и фильтрации; включает архив для истории',
  })
  @ApiOkResponse({ type: [CategoryDto] })
  options(@CurrentUser() user: User) {
    return this.service.options(user.id);
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'categoriesGet',
    summary: 'Получить собственную запись',
  })
  @ApiOkResponse({ type: CategoryDto })
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.get(user.id, validate(idSchema, id));
  }
  @Post()
  @ApiOperation({
    operationId: 'categoriesCreate',
    summary: 'Создать запись с атомарным аудитом',
  })
  @ApiBody({ type: CategoryInputDto })
  @ApiCreatedResponse({ type: CategoryDto })
  create(@CurrentUser() user: User, @Body() body: unknown) {
    return this.service.create(user.id, validate(categorySchema, body));
  }
  @Patch(':id')
  @ApiOperation({
    operationId: 'categoriesUpdate',
    summary:
      'Изменить собственную запись; требуется хотя бы одно разрешённое поле',
  })
  @ApiBody({ type: CategoryPatchDto })
  @ApiOkResponse({ type: CategoryDto })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.update(
      user.id,
      validate(idSchema, id),
      validate(categoryPatch, body),
    );
  }
  @Delete(':id')
  @ApiOperation({
    operationId: 'categoriesDelete',
    summary: 'Удалить собственную запись с сохранением аудита',
  })
  @ApiOkResponse({ type: CategoryRemovalDto })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.remove(user.id, validate(idSchema, id));
  }
}
