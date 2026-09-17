import { Component, OnInit } from '@angular/core';
import { User } from '../../../shared/model/user';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UserService } from '../../../shared/services/user.service';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css'],
})
export class UserFormComponent implements OnInit {
  user: User = new User();
  userForm!: FormGroup;
  id!: number | null;
  errorValidationBackend: any = null;
  loading: boolean = false;
  isEditMode: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private router: Router,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.id = +this.route.snapshot.paramMap.get('id')!;
    this.isEditMode = !!this.id;
    this.initForm();

    if (this.isEditMode) {
      this.loadUser();
    }
  }

  initForm() {
    // Configuración diferente de validadores para edición y creación
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      lastname: ['', [Validators.required, Validators.minLength(2)]],
      dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      phone: ['', [Validators.pattern(/^\d{9}$/)]],
      address: [''],
      // Solo incluimos email en modo edición, pero lo deshabilitamos
      ...(this.isEditMode ? { email: [{ value: '', disabled: true }] } : {}),
      // La contraseña es opcional en modo edición
      ...(this.isEditMode ? { password: [''] } : {}),
    });
  }

  loadUser() {
    this.loading = true;
    if (this.id) {
      this.userService.findById(this.id).subscribe({
        next: (data) => {
          this.user = data;
          this.userForm.patchValue({
            name: this.user.name,
            lastname: this.user.lastname,
            dni: this.user.dni,
            phone: this.user.phone,
            address: this.user.address,
            email: this.user.email,
          });
          this.loading = false;
        },
        error: (error) => {
          this.errorValidationBackend = error.error;
          this.loading = false;

          Swal.fire({
            title: 'Error',
            text: 'No se pudo cargar la información del usuario',
            icon: 'error',
            background: '#2c3e50',
            color: 'white',
            iconColor: '#e74c3c',
          });
        },
      });
    }
  }

  onSubmit() {
    if (this.userForm.invalid) {
      return;
    }

    this.loading = true;

    // Preparar los datos del usuario
    const userData = {
      ...this.user,
      ...this.userForm.value,
    };

    // Si estamos en modo edición, asegurarse de que tengamos el email
    if (this.isEditMode) {
      userData.email = this.user.email; // Mantener el email original
      // Si no hay contraseña nueva, eliminarla del objeto para no enviarla
      if (!userData.password) {
        delete userData.password;
      }
    }

    if (this.isEditMode) {
      this.userService.updateUser(userData).subscribe({
        next: () => {
          this.loading = false;
          Swal.fire({
            title: '¡Actualizado!',
            text: 'Usuario actualizado exitosamente',
            icon: 'success',
            background: '#2c3e50',
            color: 'white',
            iconColor: '#2ecc71',
          }).then(() => {
            this.router.navigate(['/users']);
          });
        },
        error: (error) => {
          this.errorValidationBackend = error.error;
          this.loading = false;
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar el usuario',
            icon: 'error',
            background: '#2c3e50',
            color: 'white',
            iconColor: '#e74c3c',
          });
        },
      });
    } else {
      this.userService.saveUser(userData).subscribe({
        next: () => {
          this.loading = false;
          Swal.fire({
            title: '¡Registrado!',
            text: 'Usuario registrado exitosamente',
            icon: 'success',
            background: '#2c3e50',
            color: 'white',
            iconColor: '#2ecc71',
          }).then(() => {
            this.router.navigate(['/users']);
          });
        },
        error: (error) => {
          this.errorValidationBackend = error.error;
          this.loading = false;
          Swal.fire({
            title: 'Error',
            text: 'No se pudo registrar el usuario',
            icon: 'error',
            background: '#2c3e50',
            color: 'white',
            iconColor: '#e74c3c',
          });
        },
      });
    }
  }

  getFieldErrorMessage(fieldName: string): string {
    const field = this.userForm.get(fieldName);

    if (!field || !field.errors || !field.touched) {
      return '';
    }

    if (field.errors['required']) {
      return 'Este campo es obligatorio';
    }

    if (field.errors['minlength']) {
      return `Debe tener al menos ${field.errors['minlength'].requiredLength} caracteres`;
    }

    if (field.errors['pattern']) {
      switch (fieldName) {
        case 'dni':
          return 'El DNI debe tener 8 dígitos numéricos';
        case 'phone':
          return 'El teléfono debe tener 9 dígitos numéricos';
        default:
          return 'Formato inválido';
      }
    }

    if (field.errors['email']) {
      return 'Email inválido';
    }

    return 'Campo inválido';
  }

  hasError(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }
}
