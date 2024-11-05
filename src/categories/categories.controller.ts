import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query, Request, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { SubscribeCategoryDto } from './dto/subscribe-category.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { validRoles } from '../auth/interfaces/valid-roles';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Auth(validRoles.seller)
  create(@Body() createCategorydDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategorydDto);
  }

  @Get()
  @Auth()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.categoriesService.findAll(paginationDto);
  }

  @Get(':term')
  @Auth()
  findOne(@Param('term') term: string) {
    return this.categoriesService.findOne(term);
  }

  @Patch(':id')
  @Auth(validRoles.admin)
  update(@Param('id',ParseUUIDPipe) id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @Auth(validRoles.admin)
  remove(@Param('id',ParseUUIDPipe) id: string) {
    return this.categoriesService.remove(id);
  }

  @Post('subscribe')
  @Auth()
  subscribe(@Request() req, @Body() subscribeCategoryDto:SubscribeCategoryDto){
    return this.categoriesService.subscribe(subscribeCategoryDto, req.user.id)
  }

  @Get('product/:id')
  @Auth()
  getByProduct(@Param('id',ParseUUIDPipe) id: string){
    return this.categoriesService.getByProduct(id);
  }
}
