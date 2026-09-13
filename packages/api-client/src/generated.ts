/**
 * Ошибки полей
 */
export type ProblemDtoErrors = {[key: string]: string[]};

export interface ProblemDto {
  /** Категория ошибки */
  type: string;
  /** Краткое описание ошибки */
  title: string;
  /** HTTP-статус */
  status: number;
  /** Безопасное описание причины */
  detail: string;
  /** Ошибки полей */
  errors: ProblemDtoErrors;
  /** Идентификатор запроса */
  traceId: string;
}

/**
 * Состояние инфраструктуры
 */
export type HealthDtoStatus = typeof HealthDtoStatus[keyof typeof HealthDtoStatus];


export const HealthDtoStatus = {
  ok: 'ok',
} as const;

export interface HealthDto {
  /** Состояние инфраструктуры */
  status: HealthDtoStatus;
}

export type healthLiveResponse200 = {
  data: HealthDto
  status: 200
}

export type healthLiveResponseSuccess = (healthLiveResponse200) & {
  headers: Headers;
};
;

export type healthLiveResponse = (healthLiveResponseSuccess)

export const getHealthLiveUrl = () => {




  return `/health/live`
}

/**
 * @summary Проверить работу процесса API
 */
export const healthLive = async ( options?: RequestInit): Promise<healthLiveResponse> => {

  const res = await fetch(getHealthLiveUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: healthLiveResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as healthLiveResponse
}



export type healthReadyResponse200 = {
  data: HealthDto
  status: 200
}

export type healthReadyResponse503 = {
  data: ProblemDto
  status: 503
}

export type healthReadyResponseSuccess = (healthReadyResponse200) & {
  headers: Headers;
};
export type healthReadyResponseError = (healthReadyResponse503) & {
  headers: Headers;
};

export type healthReadyResponse = (healthReadyResponseSuccess | healthReadyResponseError)

export const getHealthReadyUrl = () => {




  return `/health/ready`
}

/**
 * @summary Проверить доступность PostgreSQL
 */
export const healthReady = async ( options?: RequestInit): Promise<healthReadyResponse> => {

  const res = await fetch(getHealthReadyUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: healthReadyResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as healthReadyResponse
}
