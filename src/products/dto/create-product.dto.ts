import { ArrayMinSize, IsArray, IsNumber, IsString, Min } from "class-validator";

export class CreateProductDto{
    @IsString()
    readonly name: string;
    @IsNumber()
    @Min(0)
    readonly cost: number;
    @IsString()
    readonly description: string;
    @IsArray()
    @IsString({each:true})
    @ArrayMinSize(1)
    readonly categories: string[]
}
