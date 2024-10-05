import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { isUUID } from 'class-validator';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@Injectable()
export class CategoriesService {

  constructor(@InjectRepository(Category) private readonly categoryRepository: Repository<Category>){}

  // Crear una categoría
  create(createCategoryDto: CreateCategoryDto) {
    const category = this.categoryRepository.create(createCategoryDto);
    return this.categoryRepository.save(category);
  }

  // Recuperar todas las categorías por paginación
  findAll(paginationDto:PaginationDto) {
    const {limit=10, offset=0} = paginationDto;
    return this.categoryRepository.find({
      take:limit,
      skip:offset,
    });
  }

  // Hayar una categoría por un término UUID o su slug
  async findOne(term: string) {
    let category: Category
    // Por UUID
    if(isUUID(term)){
      category = await this.categoryRepository.findOneBy({id:term});
    }
    // Por slug
    else{
      const queryBuilder = this.categoryRepository.createQueryBuilder();
      // Contruimos la consulta
      category = await queryBuilder.where('UPPER(name) =: category or slug =: slug',
                                {
                                  // Damos valores a las variables category y slug
                                  category: term.toUpperCase(), slug:term.toLowerCase()
                                }).getOne()
    }

    if (!(category instanceof Category)){
      throw new NotFoundException(`No se encontró ninguna categoría con el término ${term}`)
    }

    return category 

  }

  async update(id: string, updateBrandDto: UpdateCategoryDto) {
    const category = await this.categoryRepository.preload({
      id:id,
      ...updateBrandDto
    });

    if (!(category instanceof Category)){
      throw new NotFoundException(`No se encontró ninguna categoría con el identificador ${id}`)
    }

    return this.categoryRepository.save(category);
  }

  async remove(id: string) {
    const category = await this.findOne(id);
    return this.categoryRepository.remove(category);
  }
}
