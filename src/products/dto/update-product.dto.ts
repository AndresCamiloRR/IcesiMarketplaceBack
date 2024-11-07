import { ArrayMinSize, IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class UpdateProductDto{

    @IsUUID()
    @IsOptional()
    readonly id:string;
    @IsString()
    @IsOptional()
    readonly name: string;
    @IsNumber()
    @Min(0)
    @IsOptional()
    readonly cost: number;
    @IsString()
    @IsOptional()
    readonly description: string;
    @IsArray()
    @IsString({each:true})
    @ArrayMinSize(1)
    @IsOptional()
    readonly categories: string[];
    @IsBoolean()
    @IsOptional()
    readonly inStock: boolean;
    @IsOptional()
    @IsString()
    readonly image: string;
}
