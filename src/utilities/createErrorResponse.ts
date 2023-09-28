const createErrorResponse = (statusCode, message) => ({
    statusCode,
    body: JSON.stringify({
      error: message
    }),
  });
  
  export default createErrorResponse;