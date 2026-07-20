export function reportError(error,context='frontend'){console.error(`[${context}]`,error);return error instanceof Error?error.message:String(error);}
