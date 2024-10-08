import { Body, Controller, Get, Post, Request, Put, Delete, Query, Param, ConsoleLogger } from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dtos/login-user.dto';
import { SellerDto } from './dtos/seller-dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { validRoles } from './interfaces/valid-roles';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { Auth } from './decorators/auth.decorator';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService){}
    @Post('register')
    createUser(@Body() creatUserDto: CreateUserDto){

        return this.authService.createUser(creatUserDto);
    }

    @Post('login')
    loginUser(@Body() loginUserDto: LoginUserDto){
        return this.authService.loginUser(loginUserDto);
    }

    @Post('seller')
    @Auth()
    becomeSeller(@Request() req, @Body() sellerDto: SellerDto) {
        const userId = req.user.id;
        return this.authService.becomeSeller(userId, sellerDto);
    }

    @Get('info')
    @Auth()
    myInfo(@Request() req) {
        const userId = req.user.id;
        return this.authService.myInfo(userId);
    }

    @Get('users')
    @Auth(validRoles.admin)
    findAll(@Query() paginationDto: PaginationDto) {
        return this.authService.findAll(paginationDto);
    }

    @Get(':name')
    @Auth(validRoles.admin)
    findByName(@Param('name') name:string, @Query() paginationDto: PaginationDto) {
        return this.authService.findByName(name, paginationDto);
    }

    @Put()
    @Auth()
    update(@Request() req, @Body() updateUserDto: UpdateUserDto) {
        const userId = req.user.id;
        return this.authService.update(userId, updateUserDto);
    }

    @Delete(':id')
    @Auth(validRoles.admin)
    delete(@Param('id') id: string) {
        return this.authService.delete(id);
    }

}
