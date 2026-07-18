export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;        // ISO 8601
  time: string;
  location: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventDto {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  imageUrl?: string;
}

export interface UpdateEventDto extends Partial<CreateEventDto> {}
