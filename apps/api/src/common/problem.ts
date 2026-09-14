import { HttpException } from '@nestjs/common';

export class Problem extends HttpException {
  constructor(
    status: number,
    readonly type: string,
    readonly detail: string,
    readonly errors: Record<string, string[]> = {},
  ) {
    super(detail, status);
  }
}
