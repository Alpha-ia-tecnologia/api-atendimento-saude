import { HttpException, HttpStatus } from '@nestjs/common';

export class DomainException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
  }
}

export class ResourceNotFoundException extends DomainException {
  constructor(resource: string) {
    super(`${resource} not found`, HttpStatus.NOT_FOUND);
  }
}

export class ResourceConflictException extends DomainException {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT);
  }
}

export class InvalidCredentialsException extends DomainException {
  constructor() {
    super('Invalid credentials', HttpStatus.UNAUTHORIZED);
  }
}
