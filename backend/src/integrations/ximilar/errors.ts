import {
  ApiError,
  PreconditionFailedError,
  ValidationError,
} from '../../utils/api-response';

export class XimilarConfigurationError extends PreconditionFailedError {
  constructor(message = 'Ximilar is not configured.') {
    super(message);
    this.name = 'XimilarConfigurationError';
  }
}

export class XimilarRequestError extends ApiError {
  constructor(message = 'Ximilar request failed.', details?: unknown) {
    super(503, message, details);
    this.name = 'XimilarRequestError';
  }
}

export class XimilarResponseError extends ValidationError {
  constructor(message = 'Ximilar returned an unexpected payload.', details?: unknown) {
    super(message, details);
    this.name = 'XimilarResponseError';
  }
}
