import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';

const signUpSchema = z
  .object({
    name: z.string({
      required_error: 'is required',
    }),
    email: z
      .string({ required_error: 'is required' })
      .email({ message: 'is invalid' })
      .transform((value) => value.toLowerCase()),
    password: z
      .password({ required_error: 'is required' })
      .atLeastOne('digit', 'need at least one digit')
      .min(8),
    confirmPassword: z
      .password({ required_error: 'is required' })
      .atLeastOne('digit', 'need at least one digit')
      .min(8),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: 'is not match',
    path: ['password', 'confirmPassword'],
  });

export class SignUpDto extends createZodDto(signUpSchema) {}
