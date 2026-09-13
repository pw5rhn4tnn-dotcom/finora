// Сообщения драйвера могут содержать URL, SQL или значения. Сохраняем класс
// ошибки и кадры стека без первой строки с сообщением и без финансовых данных.
export function errorDiagnostics(error: unknown) {
  return error instanceof Error
    ? {
        name: error.name,
        stack: error.stack
          ?.split('\n')
          .filter((line) => line.trimStart().startsWith('at '))
          .join('\n'),
      }
    : { name: 'UnknownError' };
}
