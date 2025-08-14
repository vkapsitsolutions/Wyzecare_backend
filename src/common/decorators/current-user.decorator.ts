import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<Request>();

    return request.user;
  },
);
