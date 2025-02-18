export interface EvaluationRequest {
  code: string;
  language: string;
  scope: Record<string, any>;
}
export interface EvaluationResponse {
  output?: any;
  error?: string;
  logs?: string[];
}

