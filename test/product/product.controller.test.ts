import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { CreateProductDto } from '../../src/products/dto/create-product.dto';
import { LoginUserDto } from '../../src/auth/dtos/login-user.dto';
import { CreateUserDto } from '../../src/auth/dtos/create-user.dto';
import { SellerDto } from '../../src/auth/dtos/seller-dto';
import crypto from 'crypto';
import { CreateCategoryDto } from 'src/categories/dto/create-category.dto';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, getConnection } from 'typeorm';
import { FilterProductDto } from 'src/products/dto/filter-product.dto';
import { Product } from 'src/products/entities/product.entity';

describe('ProductsController (e2e)', () => {
    let app: INestApplication;
    let accessToken: string;
    let productId: string;
    let categoryId: string;
    let wrongId = crypto.randomUUID();

    const createUserDto: CreateUserDto = {
        email: 'user@example.com',
        password: 'StrongPass1',
        name: 'Test User',
    };

    const loginUserDto: LoginUserDto = {
        email: 'user@example.com',
        password: 'StrongPass1',
    };

    const sellerDto: SellerDto = {
        phone: '3022852699',
        location: 'CO',
    };

    let createProductDto: CreateProductDto;

    let createProductForIdDto: CreateProductDto;

    const updateProductDto = {
        name: 'Updated Product',
        cost: 150,
        description: 'Updated Description',
        inStock: false,
    };

    const createCategoryDto: CreateCategoryDto = {
        name: 'Test Category',
        description: 'Test Description',
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule], // Importa el módulo principal de tu app
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
            }),
        );
        await app.init();

        const dataSource = app.get<DataSource>(getDataSourceToken());
        await dataSource.synchronize()

        await request(app.getHttpServer())
        .post('/auth/register')
        .send(createUserDto)

        await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginUserDto)
        .then(({ body }) => {
          accessToken = body.token;
        });

        await request(app.getHttpServer())
        .post('/auth/seller')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(sellerDto)

        await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createCategoryDto)
        .then(({ body }) => {
            categoryId = body.id;
            createProductDto = {
                name: 'Test Product',
                cost: 100,
                description: 'Test Description',
                categories: [body.id],
            };
            createProductForIdDto = {
                name: 'Test Product for Id',
                cost: 200,
                description: 'Test ID Description',
                categories: [body.id],
            };
        });

        const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createProductForIdDto);

        productId = response.body.id;
        
    }, 70 * 1000);

    afterAll(async () => {
        // Limpiar la base de datos
        const dataSource = app.get<DataSource>(getDataSourceToken());
    
        // Obtener los nombres de todas las tablas
        const tables = await dataSource.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public';  -- Cambia esto si usas otro esquema
        `);
    
        // Borrar todas las tablas
        for (const table of tables) {
          await dataSource.query(`DROP TABLE IF EXISTS "${table.table_name}" CASCADE;`);
        }
    });

    describe('/products (POST)', () => {
        it('should create a new product', async () => {
            return await request(app.getHttpServer())
                .post('/products')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(createProductDto)
                .then(({ body }) => {
                    expect(body.name).toEqual(createProductDto.name);
                    expect(body.cost).toEqual(createProductDto.cost);
                    expect(body.description).toEqual(createProductDto.description);
                });
        });
    });

    describe('/products (GET)', () => {
        it('should return a list of products', async () => {
            return request(app.getHttpServer())
                .get('/products/?offset=0&limit=10')
                .expect(200)
                .then(({ body }) => {
                    expect(Array.isArray(body)).toBe(true);
                });
        });
    });
    
    describe('/products/:id (GET)', () => {
        it('should return a product by ID', async () => {
            return request(app.getHttpServer())
                .get(`/products/${productId}`)
                .expect(200)
                .then(({ body }) => {
                    expect(body.id).toEqual(productId);
                    expect(body.name).toEqual(createProductForIdDto.name);
                });
        });

        it('should return 404 if product does not exist', async () => {
            return request(app.getHttpServer())
                .get(`/products/${wrongId}`)
                .expect(404);
        });
    });
    describe('/products (GET)', () => {
        it('should return a list of products', async () => {
            return request(app.getHttpServer())
                .get('/products/?offset=0&limit=10')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200)
                .then(({ body }) => {
                    expect(Array.isArray(body)).toBe(true);
                    expect(body.length).toBeGreaterThan(0); // Assuming there are products in the database
                });
        });
    
        it('should filter products by valid query parameters', async () => {
            const filterParams = {
                name: 'Test Product for Id',
                costHigh: 250,
                costLow: 150,
                categories: [categoryId],
                inStock: true, // Assuming you have products with this inStock value
                offset:0,
                limit:10
            };
            return request(app.getHttpServer())
                .get(`/products/`)
                .set('Authorization', `Bearer ${accessToken}`)
                .query(filterParams)
                .expect(200)
                .then(({ body }) => {
                    expect(Array.isArray(body)).toBe(true);
                    expect(body.length).toBeGreaterThan(0); // Ensure some products match the filter
                    body.forEach(product => {
                        expect(product.name).toEqual('Test Product for Id');
                        expect(product.cost).toBeGreaterThanOrEqual(150); // Check cost lower bound
                        expect(product.cost).toBeLessThanOrEqual(250); // Check cost upper bound
                        expect(product.categories).toContainEqual({id:categoryId, ...createCategoryDto, slug:createCategoryDto.name}); // Check category filter
                        expect(product.inStock).toBe(true); // Ensure products are in stock
                    });
                });
        });
    
        it('should return an empty array for non-existing filters', async () => {
            const filterParams = {
                name: 'Non-existing Product',
                offset:0,
                limit:10
            };
            return request(app.getHttpServer())
                .get('/products/')
                .set('Authorization', `Bearer ${accessToken}`)
                .query(filterParams)
                .expect(200)
                .then(({ body }) => {
                    expect(Array.isArray(body)).toBe(true);
                    expect(body.length).toBe(0); // Expect no products to match
                });
        });
    
        it('should return filtered products based on category', async () => {
            const filterParams = {
                categories: [categoryId],
                offset:0,
                limit:10
            };
            return request(app.getHttpServer())
                .get('/products/')
                .set('Authorization', `Bearer ${accessToken}`)
                .query(filterParams)
                .expect(200)
                .then(({ body }) => {
                    expect(Array.isArray(body)).toBe(true);
                    expect(body.length).toBeGreaterThan(0); // Assuming there are products in the specified category
                    body.forEach(product => {
                        expect(product.categories).toContainEqual({id:categoryId, ...createCategoryDto, slug:createCategoryDto.name});  // Ensure category matches
                    });
                });
        });
    
        it('should filter products by inStock status', async () => {
            const filterParams = {
                inStock: false, // Filter for out-of-stock products
                offset:0,
                limit:10
            };
            return request(app.getHttpServer())
                .get('/products/')
                .set('Authorization', `Bearer ${accessToken}`)
                .query(filterParams)
                .expect(200)
                .then(({ body }) => {
                    expect(Array.isArray(body)).toBe(true);
                    body.forEach(product => {
                        expect(product.inStock).toBe(false); // Ensure all returned products are out of stock
                    });
                });
        });

        it('should filter products that cost less than 250', async () => {
            const filterParams = {
                costHigh: 250,
                offset:0,
                limit:10
            };
            return request(app.getHttpServer())
                .get(`/products/`)
                .set('Authorization', `Bearer ${accessToken}`)
                .query(filterParams)
                .expect(200)
                .then(({ body }) => {
                    expect(Array.isArray(body)).toBe(true);
                    expect(body.length).toBeGreaterThan(0); // Ensure some products match the filter
                    body.forEach(product => {
                        expect(product.cost).toBeLessThanOrEqual(250); // Check cost upper bound
                    });
                });
        });
    });
    
    describe('/products/:id (PATCH)', () => {
        it('should update a product by ID', async () => {
            return request(app.getHttpServer())
                .patch(`/products/${productId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateProductDto)
                .expect(200)
                .then(({ body }) => {
                    expect(body.name).toEqual(updateProductDto.name);
                    expect(body.cost).toEqual(updateProductDto.cost);
                    expect(body.description).toEqual(updateProductDto.description);
                });
        });

        it('should return 404 if product does not exist', async () => {
            return request(app.getHttpServer())
                .patch(`/products/${wrongId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateProductDto)
                .expect(404);
        });
    });

    describe('/products/subscribe (POST)', () => {
        it('should subscribe a user to a product', async () => {
            return request(app.getHttpServer())
                .post('/products/subscribe')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ productId }) // ID del producto al que se suscribe
                .expect(201)
                .then(({ body }) => {
                    expect(body.id).toEqual(productId);
                });
        });

        it('should return 401 if user is not authenticated', async () => {
            return request(app.getHttpServer())
                .post('/products/subscribe')
                .send({ productId })
                .expect(401);
        });
    });
    
    describe('/products/:id (DELETE)', () => {
        it('should delete a product by ID', async () => {
            return request(app.getHttpServer())
                .delete(`/products/${productId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200)
                .then(({ body }) => {
                    expect(body.affected).toEqual(1);
                });
        });

    })
    
});
