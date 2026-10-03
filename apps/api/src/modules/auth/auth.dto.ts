import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length } from 'class-validator';
export class LoginDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  @Length(3, 254)
  email!: string;
  @IsString()
  @Length(15, 128)
  password!: string;
}
export class RegisterDto extends LoginDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(2, 100)
  name!: string;
}
