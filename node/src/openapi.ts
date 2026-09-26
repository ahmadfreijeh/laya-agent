import { platform } from "./platform.js";

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: `${platform.name} (Node)`,
    version: platform.version,
    description: `General customer support agent. The customer asks for something; ${platform.name} reads the need and the agent runs the matching action.`,
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
    "/questions": {
      get: {
        summary: "List question files saved for Laya",
        responses: { "200": { description: "File names in python/questions" } },
      },
    },
    "/questions/try": {
      post: {
        summary: "Run an unsaved question set against one message",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: { message: "I was charged twice", questions: { shared: {}, scenarios: {} } },
            },
          },
        },
        responses: {
          "200": { description: "Answers, whether need cleared the bars, and which follow-ups ran" },
          "400": { description: "Invalid question set" },
        },
      },
    },
    "/questions/{key}": {
      get: { summary: "Read one question file", responses: { "200": { description: "Question set" } } },
      put: {
        summary: "Save a question file through Laya",
        parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Saved file" }, "400": { description: "Invalid question set" } },
      },
      delete: {
        summary: "Delete a question file",
        parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted file" }, "404": { description: "Missing file" } },
      },
    },
    "/widget/theme": {
      get: {
        summary: "Read the shared widget theme used by the test page",
        responses: { "200": { description: "Shared theme and the defaults" } },
      },
    },
    "/widget/themes": {
      post: {
        summary: "Create a separate public widget theme",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                title: "Support",
                greeting: "Hi. How can we help?",
                logo: "",
                primary: "#1c1c1e",
                primaryText: "#ffffff",
                chatBackground: "#f7f7f8",
                agentBubble: "#ffffff",
                agentText: "#1c1c1e",
                agentIcon: "headset",
                userIcon: "user",
                position: "right",
              },
            },
          },
        },
        responses: { "201": { description: "Saved theme and its unique URL" }, "400": { description: "Invalid theme" } },
      },
    },
    "/widget/themes/{id}": {
      get: {
        summary: "Read a saved public widget theme",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Saved theme" }, "404": { description: "Theme not found" } },
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
          key: {
            type: "string",
            description: "Question file in python/questions. `support` and `support.json` both load support.json. Defaults to default.",
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
