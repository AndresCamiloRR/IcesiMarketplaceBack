import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dtos/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { SellerDto } from './dtos/seller-dto';
import { validRoles } from './interfaces/valid-roles';
import { UpdateUserDto } from './dtos/update-user.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';

@Injectable()
export class AuthService {
    constructor(@InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService){}
    async createUser(createUserDto: CreateUserDto){
        try {
            const {password, ...userData} = createUserDto;

            let user: User
            if((await this.userRepository.find()).length == 0){
                user = this.userRepository.create({
                    password: bcrypt.hashSync(password, 10),
                    roles: [validRoles.user, validRoles.admin],
                    ...userData
                })
            }else{
                user = this.userRepository.create({
                    password: bcrypt.hashSync(password, 10),
                    ...userData
                })
            }

            await this.userRepository.save(user)

            return user

        } catch (e) {
            this.handleDBErrors(e)
        }
    }

    async loginUser(loginUser: LoginUserDto){
        const {email, password} = loginUser;
        const user = await this.userRepository.findOne({
            where: {email},
            select: ['id', 'email', 'password']
        });
        if(!user || !bcrypt.compareSync(password, user.password))
            throw new UnauthorizedException('Invalid credentials');
        return {user_id: user.id, email: user.email,
            token: this.jwtService.sign({user_id: user.id})
        };
    }

    async becomeSeller(id: string, sellerDto: SellerDto){
        let user = await this.userRepository.findOne({
            where: {id}
        });
        
        if(user.roles.includes(validRoles.admin)){
            user = await this.userRepository.preload({
                id: id, roles: [validRoles.user, validRoles.admin, validRoles.seller], phone: sellerDto.phone,
                location: sellerDto.location
            })
        }else{
            user = await this.userRepository.preload({
                id: id, roles: [validRoles.user, validRoles.seller], phone: sellerDto.phone,
                location: sellerDto.location
            })
        }

        return this.userRepository.save(user);
    }

    async myInfo(id: string){
        const user = await this.userRepository.findOne({
            where: {id, isActive: true} // Added condition to ignore inactive users
        });

        return user
    }

    async update(id: string, updateBrandDto: UpdateUserDto) {
        
        const user = await this.userRepository.preload({
          id:id,
          ...updateBrandDto
        });
    
        return this.userRepository.save(user);
    }

    
    findAll(paginationDto:PaginationDto) {
        const {limit=10, offset=0} = paginationDto;
        return this.userRepository.find({
            take:limit,
            skip:offset,
            where: { isActive: true } // Added condition to ignore inactive users
        });
    }

    findByName(name:string, paginationDto:PaginationDto) {
        const {limit=10, offset=0} = paginationDto;
        return this.userRepository.find({
            where: {name, isActive: true}, // Added condition to ignore inactive users
            take:limit,
            skip:offset,
        });
    }

    findByEmail(email:string) {
        return this.userRepository.findOne({
            where: {email, isActive: true} // Added condition to ignore inactive users
        });
    }

    async delete(id:string) {
        const user = await this.userRepository.preload({
            id:id,
            isActive: false
        });

        return this.userRepository.save(user)
    }

    private handleDBErrors(error: any){
        if(error.code === '23505'){
            throw new BadRequestException('User already exists')
        }

        throw new InternalServerErrorException('Error creating user')
    }
}
/*function InjectableRepository(user: typeof User): (target: typeof AuthService, propertyKey: undefined, parameterIndex: 0) => void {
    throw new Error('Function not implemented.');
}*/

