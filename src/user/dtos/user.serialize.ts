import { z } from 'nestjs-zod/z';

export const UserSerializeSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  profilePicture: z.string().nullable(),
});
