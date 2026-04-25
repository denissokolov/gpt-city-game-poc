import {
  apiFetch,
  type CreateUserDto,
  type UpdateUserDto,
  type UserDto,
} from './client'

export function createUser(body: CreateUserDto) {
  return apiFetch<UserDto>('/users', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateUser(id: string, body: UpdateUserDto) {
  return apiFetch<UserDto>(`/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
