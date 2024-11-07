/* eslint-disable prettier/prettier */
import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {v4 as uuid} from 'uuid'
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Brackets, Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { User } from '../auth/entities/user.entity';
import { SubscribeProductDto } from './dto/subscribe-product.dto';
import { Category } from '../categories/entities/category.entity';
import { CategoriesService } from '../categories/categories.service';
import { MailService, SmsService } from '../common/common.service';
import { FilterProductDto } from './dto/filter-product.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';

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
                try{
                    const thisCat: Category = await this.categoriesService.findOne(cat)
                    categories.push(thisCat)
                    this.categoriesService.notify(cat, `Como sabemos que amas ${thisCat.name}, te puede interesar ${product.name}, por solo ${product.cost}`)
                }
                catch{
                    throw new NotFoundException("Category not found")
                }
                
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
                subscribers: [],
                image: product.image || '',
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
        const productUpdate = await this.products.findOne({
            where: { id: id },
            relations: ['owner'], // Load the 'owner' relationship
        });

        if(!productUpdate){
            throw new NotFoundException()
        }

        if (productUpdate.owner.id !== userId){
        throw new UnauthorizedException("Users may only update their products")
        }
            
        if(product.inStock) this.notify(id, `${productUpdate.name} tiene nuevas unidades ;)`);
        Object.assign(productUpdate, product);
        this.products.save(productUpdate);
        return productUpdate;
        
            
    
    }

    async myProducts(ownerId:string){
        const products = await this.products.find({
            where: { owner: { id: ownerId } },
            relations: ['categories'],
        });
        return products;
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
        const isSubscribed = await this.isSubscribed(buyer, id.productId);
        const product = await this.findById(id.productId);
        const user:User = await this.authService.myInfo(buyer);
        if (isSubscribed){
            product.subscribers = product.subscribers.filter(subscriber => subscriber.id !== buyer);
        }
        else{
            try{
                product.subscribers.push(user)
            }
            catch{
                product.subscribers = [user]
            }
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

                    if(user.phone){
                        this.smsService.sendSms(user.phone, message)
                    }

                }
            }
        }
        catch{}

        
    }

    private handleDBErrors(error: any){

        throw new InternalServerErrorException('Error creating product')
    }

    async findByFilter(filter: FilterProductDto){
        const { name, costHigh, costLow, categories, inStock, offset=0, limit=10 } = filter;
        // Create a query builder for dynamic filtering
        const query = this.products.createQueryBuilder('product');
        // Filter by name (case insensitive)
        if (categories && categories.length > 0) {
            query.innerJoinAndSelect('product.categories', 'category')
            .andWhere(new Brackets(qb => {
            const isUuid = categories.every(cat => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cat));
            if (isUuid) {
                qb.where('category.id IN (:...categories)', { categories });
            } else {
                qb.where('category.slug IN (:...categories)', { categories });
            }
            }));
        }
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
        // Filter by stock status
        if (inStock !== undefined) {
        query.andWhere('product.inStock = :inStock', { inStock });
        }
        query.skip((offset) * limit).take(limit);
        return await query.getMany();
    }

    async subscribed(userId:string){
        const user:User = await this.authService.myInfo(userId);
        const products = await this.products
        .createQueryBuilder('product')
        .innerJoinAndSelect('product.subscribers', 'subscriber') // Join with the subscribers relation
        .where('subscriber.id = :userId', { userId }) // Filter by user id
        .getMany();
        return products;
    }

    async isSubscribed(userId:string, productId:string){
        const user:User = await this.authService.myInfo(userId);
        const product = await this.products.createQueryBuilder('product')
                                        .innerJoinAndSelect('product.subscribers', 'subscriber') // Join with the subscribers relation
                                        .where('subscriber.id = :userId', { userId }) // Filter by user id
                                        .andWhere('product.id = :productId', { productId }) // Filter by product id
                                        .getOne();
        return !!product;
    
    }

    
}
