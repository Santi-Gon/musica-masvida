export interface Teacher {
  id: string;
  name: string;
  bio: string;
  photoUrl?: string;
  instruments: string[];  // Instrumentos que enseña
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeacherDto {
  name: string;
  bio: string;
  photoUrl?: string;
  instruments: string[];
  email?: string;
  phone?: string;
}

export interface UpdateTeacherDto extends Partial<CreateTeacherDto> {}
