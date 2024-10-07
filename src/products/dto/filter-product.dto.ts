import { PartialType } from "@nestjs/mapped-types";
import { ArrayMinSize, IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { PaginationDto } from "src/common/dtos/pagination.dto";

export class FilterProductDto extends PartialType(PaginationDto){

    @IsString()
    @IsOptional()
    readonly name: string;
    @IsNumber()
    @Min(0)
    @IsOptional()
    readonly costHigh: number;
    @IsNumber()
    @Min(0)
    @IsOptional()
    readonly costLow: number;
    @IsArray()
    @IsString({each:true})
    @ArrayMinSize(1)
    @IsOptional()
    readonly categories: string[];
    @IsBoolean()
    @IsOptional()
    readonly inStock: boolean;


}
