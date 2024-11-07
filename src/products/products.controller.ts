/* eslint-disable prettier/prettier */
import { Controller, Get, Post,Param, Body, ValidationPipe, UsePipes, ParseUUIDPipe, Delete, Patch, Request, UseGuards, Query  } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SubscribeProductDto } from './dto/subscribe-product.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { validRoles } from '../auth/interfaces/valid-roles';
import { FilterProductDto } from './dto/filter-product.dto';

@Controller('products')
export class ProductsController {

    constructor(public readonly productsService:ProductsService){}

    @Get()
    async findProducts(@Query() filter: FilterProductDto){
        if (Object.keys(filter).length == 0 || (Object.keys(filter).length === 2 && filter.offset && filter.limit)) {
            // If only pagination properties are present (page and limit), use getAllProducts
            return await this.productsService.findAll(filter);
          }
          // Otherwise, apply filters and pagination if necessary
          return await this.productsService.findByFilter(filter);        
    }

    @Get('psubscribed')
    @Auth()
    async subscribed(@Request() req){
        return this.productsService.subscribed(req.user.id);
    }

    @Get('psubscribed/:id')
    @Auth()
    async subscribedProduct(@Param('id', ParseUUIDPipe) id:string){
        return this.productsService.subscribed(id);
    }

    @Get('numpages')
    async pages(){
        console.log('huh')
        return this.productsService.numPages();
    }

    
    @Auth()      
    @Post('subscribe')
    subscribe(@Request() req, @Body() subscribeProductDto:SubscribeProductDto){
        return this.productsService.subscribe(subscribeProductDto,req.user.id)
    }

    @Auth()
    @Get('/myProducts')
    myProducts(@Request() req){
        return this.productsService.myProducts(req.user.id)
    }
    
    @Post()
    @UsePipes(ValidationPipe)
    @Auth(validRoles.seller)      
    async create(@Request() req, @Body() car:CreateProductDto){
        const uId:string = req.user.id;
        return this.productsService.create(car, uId);
    }

    @Get('category/:id')
    findByCategory(@Param('id', ParseUUIDPipe) categoryId:string){
        return this.productsService.findByCategory(categoryId);
    }

    @Get(':id')
    async findById(@Param('id', ParseUUIDPipe)id :string){
        return this.productsService.findById(id);
    }

    @Delete(':id')
    @Auth(validRoles.seller)
    async delete(@Param('id', ParseUUIDPipe)id :string){
        return this.productsService.delete(id);
    }

    @Patch(':id')
    @Auth(validRoles.seller)
    update(@Request() req, @Param('id', ParseUUIDPipe) id:string, @Body() body:UpdateProductDto){
        return this.productsService.update(id,body,req.user.id);
    }

    @Get('isSubscribed/:id')
    @Auth()
    async isSubscribed(@Request() req, @Param('id', ParseUUIDPipe) id:string){
        return this.productsService.isSubscribed(req.user.id, id);
    }

    @Get('seller/:id')
    @Auth()
    async getSeller(@Param('id') id:string){
        return this.productsService.getSeller(id);
    }


}
