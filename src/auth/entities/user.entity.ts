import { Column, Entity, PrimaryGeneratedColumn, OneToMany, ManyToMany, JoinTable } from "typeorm";
import { Product } from "src/products/entities/product.entity";
import { Category } from "src/categories/entities/category.entity";


@Entity('users')
export class User{
    @PrimaryGeneratedColumn('uuid')
    id:string;

    @Column('text', {unique:true})
    email: string;

    @Column('text', {select:false})
    password:string;

    @Column('text')
    name:string;

    @Column('text')
    phone:string;

    @Column('text')
    location:string;

    @Column('text', {array:true, default:['user']})
    roles: string[];

    @Column('boolean',{default:true})
    isActive: boolean;

    @OneToMany(()=>Product, (product)=>product.owner)
    products:Product

    @ManyToMany(()=>Product, (product) => product.bought)
    bought:Product

    @ManyToMany(()=>Category, (category) => category.users)
    categories:Category
}