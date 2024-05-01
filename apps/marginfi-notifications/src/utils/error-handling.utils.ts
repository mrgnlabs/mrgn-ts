export interface AllSettledResult<T> {
  fulfilledResults: T[];
  rejectedReasons: Error[];
}
