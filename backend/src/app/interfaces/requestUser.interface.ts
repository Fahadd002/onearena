import { UserRole } from "../../generated/prisma/browser";


export interface IRequestUser{
    userId : string;
    role : UserRole;
    email : string;
}
