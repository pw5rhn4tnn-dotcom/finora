export default {
  finora: {
    input: './openapi/finora.json',
    output: {
      target: './src/generated.ts',
      client: 'fetch',
      mode: 'single',
      override: { header: false },
    },
  },
};
