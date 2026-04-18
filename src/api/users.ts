import { apiFetch, type CreateUserDto, type UserDto } from './client'

export function createUser(body: CreateUserDto) {
  return apiFetch<UserDto>('/users', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
