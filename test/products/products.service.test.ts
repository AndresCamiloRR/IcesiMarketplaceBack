import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Product } from '../../src/products/entities/product.entity';
import { ProductsService } from '../../src/products/products.service';
import { AuthService } from '../../src/auth/auth.service';
import { CategoriesService } from '../../src/categories/categories.service';
import { CreateProductDto } from '../../src/products/dto/create-product.dto';
import { UpdateProductDto } from '../../src/products/dto/update-product.dto';
import { SubscribeProductDto } from '../../src/products/dto/subscribe-product.dto';
import { User } from '../../src/auth/entities/user.entity';
import { Category } from '../../src/categories/entities/category.entity';
import { Repository } from 'typeorm';

describe('ProductsService', () => {
    let service: ProductsService;
    let productId: string
    const mockProductRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOneBy: jest.fn(),
        delete: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getOne: jest.fn(),
        relation: jest.fn().mockReturnThis(),
        of: jest.fn().mockReturnThis(),
        loadMany: jest.fn(),
        preload: jest.fn(),
        findById: jest.fn(),
        findOne: jest.fn()
    };

    const mockAuthService = {
        myInfo: jest.fn(),
    };

    const mockCategoriesService = {
        findOne: jest.fn(),
        notify: jest.fn(),
    };

    const createProductDto: CreateProductDto = {
        name: 'Test Product',
        cost: 100,
        description: 'Test Description',
        categories: ['category-id'],
    };

    const updateProductDto: UpdateProductDto = {
        name: 'Updated Product',
        cost: 150,
        description: 'Updated Description',
        categories: ['category-id'],
        id: '',
        inStock: false
    };

    const product: Product = {
        id: 'product-id',
        ...createProductDto,
        inStock: true,
        owner: {} as User,
        categories: [] as Category[],
        subscribers: [] as User[],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductsService,
                {
                    provide: getRepositoryToken(Product),
                    useValue: mockProductRepository,
                },
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
                {
                    provide: CategoriesService,
                    useValue: mockCategoriesService,
                },
            ],
        }).compile();

        service = module.get<ProductsService>(ProductsService);
    });

    describe('create', () => {
        
        it('should create a product successfully', async () => {
            mockCategoriesService.findOne.mockResolvedValue(createProductDto.categories[0]);
            mockAuthService.myInfo.mockResolvedValue({ id: 'user-id' } as User);
            mockProductRepository.save.mockResolvedValue(product);

            const result = await service.create(createProductDto, 'user-id');
            productId = result.id
            expect(result.name).toEqual(product.name);
            expect(result.owner.id).toEqual('user-id');
            expect(result.categories[0]).toEqual(createProductDto.categories[0]);
            expect(result.cost).toEqual(createProductDto.cost);
            expect(result.description).toEqual(createProductDto.description)
            expect(mockAuthService.myInfo).toHaveBeenCalledWith('user-id');
        });

        it('should throw InternalServerErrorException if an error occurs', async () => {
            mockCategoriesService.findOne.mockResolvedValue({} as Category);
            mockAuthService.myInfo.mockResolvedValue({ id: 'user-id' } as User);
            mockProductRepository.save.mockImplementation(() => {
                throw new Error();
            });

            await expect(service.create(createProductDto, 'user-id')).rejects.toThrow(InternalServerErrorException);
        });
    });

    describe('findById', () => {
        it('should return a product by ID', async () => {
            mockProductRepository.findOneBy.mockResolvedValue(product);

            const result = await service.findById(product.id);

            expect(result).toEqual(product);
            expect(mockProductRepository.findOneBy).toHaveBeenCalledWith({ id: product.id });
        });

        it('should throw NotFoundException if no product is found', async () => {
            mockProductRepository.findOneBy.mockResolvedValue(null);

            await expect(service.findById(product.id)).rejects.toThrow(NotFoundException);
        });
    });

    describe('findAll', () => {
        it('should return a list of products', async () => {
            mockProductRepository.find.mockResolvedValue([product]);

            const result = await service.findAll();

            expect(result).toEqual([product]);
            expect(mockProductRepository.find).toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('should update a product successfully', async () => {
            mockProductRepository.findOneBy.mockResolvedValue(product);
            mockProductRepository.findById.mockResolvedValue(product);
            mockProductRepository.save.mockResolvedValue(product);

            const result = await service.update(product.id, updateProductDto);

            expect(result).toEqual(product);
            expect(mockProductRepository.findOneBy).toHaveBeenCalledWith({"id": "product-id"});
            expect(mockProductRepository.save).toHaveBeenCalledWith(expect.objectContaining(updateProductDto));
        });

        it('should throw NotFoundException if the product is not found', async () => {
            mockProductRepository.findOneBy.mockResolvedValue(null);

            await expect(service.update(product.id, updateProductDto)).rejects.toThrow(NotFoundException);
        });
    });

    describe('delete', () => {
        it('should delete a product successfully', async () => {
            mockProductRepository.findOne.mockResolvedValue(product);
            mockProductRepository.findOneBy.mockResolvedValue(product);
            mockProductRepository.delete.mockResolvedValue({ affected: 1 });

            const result = await service.delete(product.id);

            expect(result).toEqual({ affected: 1 });
            expect(mockProductRepository.findOneBy).toHaveBeenCalledWith({ id: product.id });
            expect(mockProductRepository.delete).toHaveBeenCalledWith(product.id);
        });

        it('should throw not found exception', async () => {
            mockProductRepository.findOne.mockResolvedValue(undefined);
            mockProductRepository.findOneBy.mockResolvedValue(undefined);

            await expect(service.delete(product.id)).rejects.toThrow(Error);
        });

    });

    describe('subscribe', () => {
        it('should subscribe a user to a product successfully', async () => {
            const subscribeProductDto: SubscribeProductDto = { productId: product.id };
            const user: User = { id: 'user-id' } as User;

            mockProductRepository.findOneBy.mockResolvedValue(product);
            mockAuthService.myInfo.mockResolvedValue(user);
            mockProductRepository.save.mockResolvedValue({ ...product, subscribers: [user] });

            const result = await service.subscribe(subscribeProductDto, 'user-id');

            expect(result).toEqual({ ...product, subscribers: [user] });
            expect(mockProductRepository.findOneBy).toHaveBeenCalledWith({ id: product.id });
            expect(mockAuthService.myInfo).toHaveBeenCalledWith('user-id');
        });
    });
});