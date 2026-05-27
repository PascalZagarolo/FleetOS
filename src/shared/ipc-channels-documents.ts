export const IPC_CHANNELS_DOCUMENTS = {
  // Renderer -> Main
  IMPORT: 'documents:import',
  READ_BASE64: 'documents:read-base64',
  OPEN: 'documents:open',
  EXPORT: 'documents:export',
  DELETE: 'documents:delete',
  REVEAL: 'documents:reveal',
  GET_LOCAL_PATH: 'documents:get-local-path',
} as const;
