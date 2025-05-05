export class User  {
  id !: number;
  name: string = '';
  lastname: string = '';
  dni: string = '';
  phone: string = '';
  address: string = '';
  email: string = '';
  password: string = '';
  estado: boolean = true;
  admin?: boolean;
}
