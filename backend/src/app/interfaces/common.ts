import { UserRole } from "../../generated/prisma/enums";


export type IAuthUser = {
    email: string;
    role: UserRole
} | null;