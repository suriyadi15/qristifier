export type QristifierErrorCode =
  | 'INVALID_QRIS'
  | 'INVALID_INPUT'
  | 'INVALID_TEMPLATE'
  | 'UNKNOWN_TEMPLATE'
  | 'PNG_NOT_READY'

export class QristifierError extends Error {
  constructor(
    readonly code: QristifierErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'QristifierError'
  }
}
