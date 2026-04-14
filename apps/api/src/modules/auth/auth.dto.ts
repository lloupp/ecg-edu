import { IsEmail, IsIn } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsIn(['student', 'teacher'])
  role!: 'student' | 'teacher';
}
