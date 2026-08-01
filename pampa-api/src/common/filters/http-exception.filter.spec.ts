import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('preserves validation messages from the ValidationPipe', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/users' }),
      }),
    } as unknown as ArgumentsHost;

    new HttpExceptionFilter().catch(
      new BadRequestException([
        'La contraseña debe incluir una mayúscula.',
        'La contraseña debe incluir un símbolo.',
      ]),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: [
          'La contraseña debe incluir una mayúscula.',
          'La contraseña debe incluir un símbolo.',
        ],
      }),
    );
  });
});
