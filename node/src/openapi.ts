export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Laya agent (Node)",
    version: "0.1.0",
    description: "General customer support agent. The customer asks for something; Laya reads the need and the agent runs the matching action.",
  },
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": {
            description: "Agent is up",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { ok: { type: "boolean", example: true } },
                },
              },
            },
          },
        },
      },
    },
    "/agent": {
      post: {
        summary: "Handle a customer message",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AgentRequest" },
              example: {
                state: {
                  customer: "user@acme.com",
                  message: "Where is my order? It was supposed to arrive yesterday.",
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Chosen action and reply",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AgentResult" },
              },
            },
          },
          "400": { description: "Invalid body" },
          "502": { description: "Laya predict failed" },
        },
      },
    },
  },
  components: {
    schemas: {
      AgentRequest: {
        type: "object",
        required: ["state"],
        properties: {
          state: {
            type: "object",
            required: ["message"],
            properties: {
              customer: { type: "string" },
              message: { type: "string", minLength: 1 },
            },
          },
        },
      },
      AgentResult: {
        type: "object",
        properties: {
          action: { type: "string", example: "reply" },
          used_llm: { type: "boolean" },
          tool: { type: "string", nullable: true },
          reply: { type: "string" },
          answers: { type: "object" },
        },
      },
    },
  },
};
