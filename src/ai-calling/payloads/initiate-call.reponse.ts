export interface InitiateCallResponse {
  call_id: string;
  // other fields the provider returns (optional)
  [key: string]: any;
}
