import { PartialType } from "@nestjs/mapped-types";
import { ArrayMinSize, IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { PaginationDto } from "../../common/dtos/pagination.dto";
import { Transform, Type } from "class-transformer";

export class FilterProductDto extends PartialType(PaginationDto){

    @IsString()
    @IsOptional()
    readonly name?: string;
    @IsNumber()
    @Min(0)
    @IsOptional()
    @Type(()=>Number)
    readonly costHigh?: number;
    @IsNumber()
    @Min(0)
    @IsOptional()
    @Type(()=>Number)
    readonly costLow?: number;
    @IsArray()
    @IsUUID('all',{each:true})
    @ArrayMinSize(1)
    @IsOptional()
    @Transform(({ value }) => {
        if(Array.isArray(value) && value.every(item => typeof item === 'string')){
            return value
        }
        return [value]})
    readonly categories?: string[];
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => {
    // Check for boolean values explicitly
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value; // Return the original value if not "true" or "false"
    })
    readonly inStock?: boolean;


}
