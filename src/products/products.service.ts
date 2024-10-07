/* eslint-disable prettier/prettier */
import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {v4 as uuid} from 'uuid'
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { User } from '../auth/entities/user.entity';
import { SubscribeProductDto } from './dto/subscribe-product.dto';
import { Category } from '../categories/entities/category.entity';
import { CategoriesService } from '../categories/categories.service';
import { MailService, SmsService } from '../common/common.service';
import { FilterProductDto } from './dto/filter-product.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@Injectable()
export class ProductsService {
    constructor (@InjectRepository(Product) private readonly products:Repository<Product>, 
    private readonly categoriesService:CategoriesService, 
    private readonly authService:AuthService,
    private readonly mailService:MailService,
    private readonly smsService:SmsService
){}

    async findById(id: string){
        const product= await this.products.findOneBy({id:id});
        if(product==undefined){
            throw new NotFoundException();
        }
        return product;
    }

    findAll(paginationDto:PaginationDto) {
        const {limit=10, offset=0} = paginationDto;
        return this.products.find({
          take:limit,
          skip:offset,
        });
      }
    
    async create(product:CreateProductDto, uId:string){
        try {
            const categoriesId:string[] = product.categories;
            var categories: Category[] = [];
            for (const cat of categoriesId){
                const thisCat: Category = await this.categoriesService.findOne(cat)
                categories.push(thisCat)
                this.categoriesService.notify(cat, `Como sabemos que amas ${thisCat.name}, te puede interesar ${product.name}, por solo ${product.cost}`)
            }
            const owner: User = await this.authService.myInfo(uId);
            const newProduct = {
                id: uuid(), 
                categories: categories, 
                cost: product.cost, 
                description: product.description, 
                name: product.name,
                inStock: true,
                owner: owner,
                subscribers: []
            };
            this.products.save(newProduct);
            return newProduct;
        } catch (e) {
            this.handleDBErrors(e)
        }
        
    }
        

    async delete(id: string) {
        // First, find the product with its relations
        const product = await this.products.findOneBy({id})
      
        if (!product) {
          throw new Error(`Product with ID ${id} not found`);
        }
      
        // Clear the relations before deleting the product
        product.categories = [];
        product.subscribers = [];
        await this.products.save(product);
      
        // Now delete the product
        return await this.products.delete(id);
      }
      

    async update(id:string, product: UpdateProductDto, userId: string){
        const user:User = await this.authService.myInfo(userId);
        const productUpdate = await this.findById(id);

        if (productUpdate.owner != user){
            throw new UnauthorizedException("Users may only update their products")
        }
        
        //console.log(product)
        if(product.inStock) this.notify(id, `${productUpdate.name} tiene nuevas unidades ;)`);
        Object.assign(productUpdate, product);
        this.products.save(productUpdate);
        return productUpdate;
    }

    async findByCategory(categoryId:string){
        const products = await this.products
        .createQueryBuilder('product')
        .innerJoinAndSelect('product.categories', 'category') // Join with the categories relation
        .where('category.id = :categoryId', { categoryId }) // Filter by category id
        .getMany();
        return products;

    }

    async subscribe(id:SubscribeProductDto, buyer: string){
        const product = await this.findById(id.productId);
        const user:User = await this.authService.myInfo(buyer);
        try{
            product.subscribers.push(user)
        }
        catch{
            product.subscribers = [user]
        }
        await this.products.save(product);

        return product;
    }

    async notify(id:string, message:string){
        const product: Product = await this.findById(id);
        const users:User[] = await this.products
                            .createQueryBuilder()
                            .relation(Product, 'subscribers')
                            .of(id)
                            .loadMany();
        try{
            for (const user of users){
                if ((Date.now()-user.lastNotified.getTime()) >= 10800000){

                    
                    this.mailService.sendEmail(user.email, "Te puede interesar", message)

                    this.smsService.sendSms("573022852699", message)


                }
            }
        }
        catch{}

        
    }

    private handleDBErrors(error: any){

        throw new InternalServerErrorException('Error creating product')
    }

    async findByFilter(filter: FilterProductDto){
        const { name, costHigh, costLow, categories, inStock } = filter;
        // Create a query builder for dynamic filtering
        const query = this.products.createQueryBuilder('product');
        // Filter by name (case insensitive)
        if (name) {
        query.andWhere('LOWER(product.name) LIKE LOWER(:name)', { name: `%${name}%` });
        }
        // Filter by cost range
        if (costHigh !== undefined) {
        query.andWhere('product.cost <= :costHigh', { costHigh });
        }
        if (costLow !== undefined) {
        query.andWhere('product.cost >= :costLow', { costLow });
        }
        // Filter by categories
        if (categories && categories.length > 0) {
        query.andWhere('product.category IN (:...categories)', { categories });
        }
        // Filter by stock status
        if (inStock !== undefined) {
        query.andWhere('product.inStock = :inStock', { inStock });
        }
        // Execute the query and return the result
        return await query.getMany();
    }


    

    
}
