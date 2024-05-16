import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';

export const UpdateUserSchema = z.object({
  name: z.string().optional(),
  profilePicture: z.string().optional(),
});

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
