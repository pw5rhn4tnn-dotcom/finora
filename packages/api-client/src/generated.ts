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

export interface RegisterInputDto {
  /**
     * Имя профиля
     * @minLength 1
     * @maxLength 100
     */
  displayName: string;
  /** Код основной валюты из /settings/options */
  baseCurrency: string;
  /** Часовой пояс IANA из /settings/options */
  timeZone: string;
  /**
     * Email нового пользователя
     * @maxLength 254
     */
  email: string;
  /**
     * Пароль от 12 до 128 символов
     * @minLength 12
     * @maxLength 128
     */
  password: string;
}

export interface UserDto {
  /**
     * Имя профиля
     * @minLength 1
     * @maxLength 100
     */
  displayName: string;
  /** Код основной валюты из /settings/options */
  baseCurrency: string;
  /** Часовой пояс IANA из /settings/options */
  timeZone: string;
  /** Идентификатор текущего пользователя */
  id: string;
  /** Нормализованный email */
  email: string;
  /** Основная валюта заблокирована финансовыми данными или их историей */
  baseCurrencyLocked: boolean;
}

export interface LoginInputDto {
  /**
     * Email, регистр не учитывается
     * @maxLength 254
     */
  email: string;
  /**
     * Пароль
     * @minLength 1
     * @maxLength 128
     */
  password: string;
}

export interface PreferenceOptionsDto {
  /** Поддерживаемые коды валют */
  currencies: string[];
  /** Поддерживаемые часовые пояса IANA */
  timeZones: string[];
}

export interface ProfileInputDto {
  /**
     * Имя профиля
     * @minLength 1
     * @maxLength 100
     */
  displayName: string;
  /** Код основной валюты из /settings/options */
  baseCurrency: string;
  /** Часовой пояс IANA из /settings/options */
  timeZone: string;
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



export type authRegisterResponse201 = {
  data: UserDto
  status: 201
}

export type authRegisterResponse400 = {
  data: ProblemDto
  status: 400
}

export type authRegisterResponse401 = {
  data: ProblemDto
  status: 401
}

export type authRegisterResponse403 = {
  data: ProblemDto
  status: 403
}

export type authRegisterResponse409 = {
  data: ProblemDto
  status: 409
}

export type authRegisterResponse413 = {
  data: ProblemDto
  status: 413
}

export type authRegisterResponse429 = {
  data: ProblemDto
  status: 429
}

export type authRegisterResponse500 = {
  data: ProblemDto
  status: 500
}

export type authRegisterResponseSuccess = (authRegisterResponse201) & {
  headers: Headers;
};
export type authRegisterResponseError = (authRegisterResponse400 | authRegisterResponse401 | authRegisterResponse403 | authRegisterResponse409 | authRegisterResponse413 | authRegisterResponse429 | authRegisterResponse500) & {
  headers: Headers;
};

export type authRegisterResponse = (authRegisterResponseSuccess | authRegisterResponseError)

export const getAuthRegisterUrl = () => {




  return `/api/v1/auth/register`
}

/**
 * @summary Создать аккаунт, стандартные категории и сессию
 */
export const authRegister = async (registerInputDto: RegisterInputDto, options?: RequestInit): Promise<authRegisterResponse> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getAuthRegisterUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(registerInputDto)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: authRegisterResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as authRegisterResponse
}



export type authLoginResponse200 = {
  data: UserDto
  status: 200
}

export type authLoginResponse400 = {
  data: ProblemDto
  status: 400
}

export type authLoginResponse401 = {
  data: ProblemDto
  status: 401
}

export type authLoginResponse403 = {
  data: ProblemDto
  status: 403
}

export type authLoginResponse409 = {
  data: ProblemDto
  status: 409
}

export type authLoginResponse413 = {
  data: ProblemDto
  status: 413
}

export type authLoginResponse429 = {
  data: ProblemDto
  status: 429
}

export type authLoginResponse500 = {
  data: ProblemDto
  status: 500
}

export type authLoginResponseSuccess = (authLoginResponse200) & {
  headers: Headers;
};
export type authLoginResponseError = (authLoginResponse400 | authLoginResponse401 | authLoginResponse403 | authLoginResponse409 | authLoginResponse413 | authLoginResponse429 | authLoginResponse500) & {
  headers: Headers;
};

export type authLoginResponse = (authLoginResponseSuccess | authLoginResponseError)

export const getAuthLoginUrl = () => {




  return `/api/v1/auth/login`
}

/**
 * @summary Войти по email и паролю
 */
export const authLogin = async (loginInputDto: LoginInputDto, options?: RequestInit): Promise<authLoginResponse> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getAuthLoginUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(loginInputDto)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: authLoginResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as authLoginResponse
}



export type authLogoutResponse204 = {
  data: void
  status: 204
}

export type authLogoutResponse400 = {
  data: ProblemDto
  status: 400
}

export type authLogoutResponse401 = {
  data: ProblemDto
  status: 401
}

export type authLogoutResponse403 = {
  data: ProblemDto
  status: 403
}

export type authLogoutResponse409 = {
  data: ProblemDto
  status: 409
}

export type authLogoutResponse413 = {
  data: ProblemDto
  status: 413
}

export type authLogoutResponse429 = {
  data: ProblemDto
  status: 429
}

export type authLogoutResponse500 = {
  data: ProblemDto
  status: 500
}

export type authLogoutResponseSuccess = (authLogoutResponse204) & {
  headers: Headers;
};
export type authLogoutResponseError = (authLogoutResponse400 | authLogoutResponse401 | authLogoutResponse403 | authLogoutResponse409 | authLogoutResponse413 | authLogoutResponse429 | authLogoutResponse500) & {
  headers: Headers;
};

export type authLogoutResponse = (authLogoutResponseSuccess | authLogoutResponseError)

export const getAuthLogoutUrl = () => {




  return `/api/v1/auth/logout`
}

/**
 * @summary Удалить cookie текущего браузера; ранее скопированный JWT действует до истечения 24 часов
 */
export const authLogout = async ( options?: RequestInit): Promise<authLogoutResponse> => {

  const res = await fetch(getAuthLogoutUrl(),
  {
    ...options,
    method: 'POST'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: authLogoutResponse['data'] = body ? JSON.parse(body) : undefined
  return { data, status: res.status, headers: res.headers } as authLogoutResponse
}



export type authMeResponse200 = {
  data: UserDto
  status: 200
}

export type authMeResponse400 = {
  data: ProblemDto
  status: 400
}

export type authMeResponse401 = {
  data: ProblemDto
  status: 401
}

export type authMeResponse403 = {
  data: ProblemDto
  status: 403
}

export type authMeResponse409 = {
  data: ProblemDto
  status: 409
}

export type authMeResponse413 = {
  data: ProblemDto
  status: 413
}

export type authMeResponse429 = {
  data: ProblemDto
  status: 429
}

export type authMeResponse500 = {
  data: ProblemDto
  status: 500
}

export type authMeResponseSuccess = (authMeResponse200) & {
  headers: Headers;
};
export type authMeResponseError = (authMeResponse400 | authMeResponse401 | authMeResponse403 | authMeResponse409 | authMeResponse413 | authMeResponse429 | authMeResponse500) & {
  headers: Headers;
};

export type authMeResponse = (authMeResponseSuccess | authMeResponseError)

export const getAuthMeUrl = () => {




  return `/api/v1/auth/me`
}

/**
 * @summary Получить текущего пользователя из JWT cookie
 */
export const authMe = async ( options?: RequestInit): Promise<authMeResponse> => {

  const res = await fetch(getAuthMeUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: authMeResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as authMeResponse
}



export type settingsOptionsResponse200 = {
  data: PreferenceOptionsDto
  status: 200
}

export type settingsOptionsResponse400 = {
  data: ProblemDto
  status: 400
}

export type settingsOptionsResponse401 = {
  data: ProblemDto
  status: 401
}

export type settingsOptionsResponse403 = {
  data: ProblemDto
  status: 403
}

export type settingsOptionsResponse409 = {
  data: ProblemDto
  status: 409
}

export type settingsOptionsResponse413 = {
  data: ProblemDto
  status: 413
}

export type settingsOptionsResponse429 = {
  data: ProblemDto
  status: 429
}

export type settingsOptionsResponse500 = {
  data: ProblemDto
  status: 500
}

export type settingsOptionsResponseSuccess = (settingsOptionsResponse200) & {
  headers: Headers;
};
export type settingsOptionsResponseError = (settingsOptionsResponse400 | settingsOptionsResponse401 | settingsOptionsResponse403 | settingsOptionsResponse409 | settingsOptionsResponse413 | settingsOptionsResponse429 | settingsOptionsResponse500) & {
  headers: Headers;
};

export type settingsOptionsResponse = (settingsOptionsResponseSuccess | settingsOptionsResponseError)

export const getSettingsOptionsUrl = () => {




  return `/api/v1/settings/options`
}

/**
 * @summary Каталог валют и часовых поясов для регистрации и настроек
 */
export const settingsOptions = async ( options?: RequestInit): Promise<settingsOptionsResponse> => {

  const res = await fetch(getSettingsOptionsUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: settingsOptionsResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as settingsOptionsResponse
}



export type settingsGetResponse200 = {
  data: UserDto
  status: 200
}

export type settingsGetResponse400 = {
  data: ProblemDto
  status: 400
}

export type settingsGetResponse401 = {
  data: ProblemDto
  status: 401
}

export type settingsGetResponse403 = {
  data: ProblemDto
  status: 403
}

export type settingsGetResponse409 = {
  data: ProblemDto
  status: 409
}

export type settingsGetResponse413 = {
  data: ProblemDto
  status: 413
}

export type settingsGetResponse429 = {
  data: ProblemDto
  status: 429
}

export type settingsGetResponse500 = {
  data: ProblemDto
  status: 500
}

export type settingsGetResponseSuccess = (settingsGetResponse200) & {
  headers: Headers;
};
export type settingsGetResponseError = (settingsGetResponse400 | settingsGetResponse401 | settingsGetResponse403 | settingsGetResponse409 | settingsGetResponse413 | settingsGetResponse429 | settingsGetResponse500) & {
  headers: Headers;
};

export type settingsGetResponse = (settingsGetResponseSuccess | settingsGetResponseError)

export const getSettingsGetUrl = () => {




  return `/api/v1/settings`
}

/**
 * @summary Получить свой профиль и настройки
 */
export const settingsGet = async ( options?: RequestInit): Promise<settingsGetResponse> => {

  const res = await fetch(getSettingsGetUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: settingsGetResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as settingsGetResponse
}



export type settingsUpdateResponse200 = {
  data: UserDto
  status: 200
}

export type settingsUpdateResponse400 = {
  data: ProblemDto
  status: 400
}

export type settingsUpdateResponse401 = {
  data: ProblemDto
  status: 401
}

export type settingsUpdateResponse403 = {
  data: ProblemDto
  status: 403
}

export type settingsUpdateResponse409 = {
  data: ProblemDto
  status: 409
}

export type settingsUpdateResponse413 = {
  data: ProblemDto
  status: 413
}

export type settingsUpdateResponse429 = {
  data: ProblemDto
  status: 429
}

export type settingsUpdateResponse500 = {
  data: ProblemDto
  status: 500
}

export type settingsUpdateResponseSuccess = (settingsUpdateResponse200) & {
  headers: Headers;
};
export type settingsUpdateResponseError = (settingsUpdateResponse400 | settingsUpdateResponse401 | settingsUpdateResponse403 | settingsUpdateResponse409 | settingsUpdateResponse413 | settingsUpdateResponse429 | settingsUpdateResponse500) & {
  headers: Headers;
};

export type settingsUpdateResponse = (settingsUpdateResponseSuccess | settingsUpdateResponseError)

export const getSettingsUpdateUrl = () => {




  return `/api/v1/settings`
}

/**
 * @summary Изменить имя, валюту и часовой пояс своего профиля; чужие ID запрещены
 */
export const settingsUpdate = async (profileInputDto: ProfileInputDto, options?: RequestInit): Promise<settingsUpdateResponse> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getSettingsUpdateUrl(),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(profileInputDto)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: settingsUpdateResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as settingsUpdateResponse
}
