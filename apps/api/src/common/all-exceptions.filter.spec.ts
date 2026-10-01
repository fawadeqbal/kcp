import { type ArgumentsHost, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter, type ErrorBody } from './all-exceptions.filter.js';

function mockHost() {
  const res = {
    statusCode: 0,
    body: undefined as ErrorBody | undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: ErrorBody) {
      this.body = payload;
      return this;
    },
  };
  const req = { id: 'req-12345678', url: '/things', originalUrl: '/v1/things', method: 'GET' };
  const host = {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('keeps the status and message of HTTP errors and adds the request ID', () => {
    const { host, res } = mockHost();
    filter.catch(new NotFoundException('Lesson not found'), host);
    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      message: 'Lesson not found',
      requestId: 'req-12345678',
      path: '/v1/things',
    });
  });

  it('answers requests over the size limit with 413, not a server error', () => {
    const { host, res } = mockHost();
    const tooLarge = Object.assign(new Error('request entity too large'), {
      type: 'entity.too.large',
      status: 413,
    });
    filter.catch(tooLarge, host);
    expect(res.statusCode).toBe(413);
    expect(res.body).toMatchObject({ statusCode: 413, error: 'PAYLOAD_TOO_LARGE' });
  });

  it('passes validation messages through as a list', () => {
    const { host, res } = mockHost();
    filter.catch(new BadRequestException(['nickname must be shorter than 20 characters']), host);
    expect(res.body?.message).toEqual(['nickname must be shorter than 20 characters']);
  });

  it('passes small plain details through, and nothing nested', () => {
    const { host, res } = mockHost();
    filter.catch(
      new BadRequestException({
        error: 'MESSAGE_BLOCKED',
        message: 'Try again',
        details: { reason: 'LINK' },
      }),
      host,
    );
    expect(res.body).toMatchObject({ error: 'MESSAGE_BLOCKED', details: { reason: 'LINK' } });
    const other = mockHost();
    filter.catch(
      new BadRequestException({ error: 'X', message: 'y', details: { nested: { secret: 1 } } }),
      other.host,
    );
    expect(other.res.body).not.toHaveProperty('details');
  });

  it('hides the details of unexpected errors and logs them', () => {
    const logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { host, res } = mockHost();
    filter.catch(new Error('connection string postgresql://secret@db'), host);
    expect(res.statusCode).toBe(500);
    expect(res.body?.message).toBe('Internal server error');
    expect(JSON.stringify(res.body)).not.toContain('secret');
    expect(logError).toHaveBeenCalledOnce();
    logError.mockRestore();
  });
});
