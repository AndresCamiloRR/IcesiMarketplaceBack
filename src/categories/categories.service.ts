import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { isUUID } from 'class-validator';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { SubscribeCategoryDto } from './dto/subscribe-category.dto';
import { User } from '../auth/entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { MailService, SmsService } from '../common/common.service';

@Injectable()
export class CategoriesService {

  constructor(@InjectRepository(Category) private readonly categoryRepository: Repository<Category>, 
  private readonly authService:AuthService,
  private readonly mailService:MailService,
  private readonly smsService:SmsService
){}

  // Crear una categoría
  async create(createCategoryDto: CreateCategoryDto) {
    try {
      const category = this.categoryRepository.create(createCategoryDto);
      await this.categoryRepository.save(category)
      return category;
    } catch (e) {
      this.handleDBErrors(e)
    }
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
      // Contruimos la consulta
      category = await this.categoryRepository.createQueryBuilder().where('UPPER(name) = :category or slug =  :slug',
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

  async subscribe(id:SubscribeCategoryDto, buyer: string){
    const product = await this.findOne(id.categoryId);
    const user:User = await this.authService.myInfo(buyer);
    try{
        product.subscribers.push(user)
    }
    catch{
        product.subscribers = [user]
    }
    await this.categoryRepository.save(product);

    return product;
  }

  async notify(id:string, message:string){
    const category: Category = await this.findOne(id);
    const users:User[] = await this.categoryRepository
                        .createQueryBuilder()
                        .relation(Category, 'subscribers')
                        .of(id)
                        .loadMany();
    //try{
        for (const user of users){
            if ((Date.now()-user.lastNotified.getTime()) >= 10800000){
                this.mailService.sendEmail(user.email, "Te puede interesar", message)
                if(user.phone){
                  this.smsService.sendSms(user.phone, message)
              }
            }

        }
    //}
    //catch{}

    
}

  private handleDBErrors(error: any){
    if(error.code === '23505'){
        throw new BadRequestException('Category already exists')
    }

    throw new InternalServerErrorException('Error creating category')
  }


  
}
