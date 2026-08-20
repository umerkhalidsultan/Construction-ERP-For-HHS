import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'The password currently in use' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  currentPassword!: string;

  @ApiProperty({
    minLength: 12,
    description:
      'New password. Must contain upper case, lower case, a digit and a symbol.',
  })
  @IsString()
  @MinLength(12)
  @MaxLength(200)
  @Matches(/[a-z]/, {
    message: 'New password must include a lower case letter.',
  })
  @Matches(/[A-Z]/, {
    message: 'New password must include an upper case letter.',
  })
  @Matches(/\d/, { message: 'New password must include a number.' })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'New password must include a symbol.',
  })
  newPassword!: string;

  @ApiProperty({ description: 'Repeat of the new password' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  confirmPassword!: string;
}
