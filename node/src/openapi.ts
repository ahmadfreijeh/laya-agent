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
    "/brains": {
      get: {
        summary: "List brain files saved for Laya",
        responses: { "200": { description: "File names in python/questions" } },
      },
    },
    "/brains/try": {
      post: {
        summary: "Run an unsaved brain against one message",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: { message: "I was charged twice", brain: { shared: {}, scenarios: {} } },
            },
          },
        },
        responses: {
          "200": { description: "Answers, whether need cleared the bars, and which follow-ups ran" },
          "400": { description: "Invalid brain" },
        },
      },
    },
    "/brains/{key}": {
      get: { summary: "Read one brain file", responses: { "200": { description: "Brain" } } },
      put: {
        summary: "Save a brain through Laya",
        parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Saved brain" }, "400": { description: "Invalid brain" } },
      },
      delete: {
        summary: "Delete a brain file",
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
                webhookUrl: "https://example.com/webhooks/relay",
              },
            },
          },
        },
        responses: { "201": { description: "Saved widget theme and optional webhook credentials" }, "400": { description: "Invalid theme or webhook URL" } },
      },
    },
    "/widget/themes/{id}": {
      get: {
        summary: "Read a saved public widget theme",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Saved theme" }, "404": { description: "Theme not found" } },
      },
    },
    "/webhooks/test": {
      post: {
        summary: "Development-only webhook receiver; logs the payload when ENABLE_TEST_WEBHOOK=true",
        responses: { "204": { description: "Payload logged" }, "404": { description: "Test receiver disabled" } },
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
                widgetId: "a4ea1736-8bdd-45a5-9bee-38c3645e5e86",
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
            description: "Brain key maps to a question file in python/questions. `support` and `support.json` both load support.json. Defaults to default.",
          },
          widgetId: {
            type: "string",
            format: "uuid",
            description: "Public widget ID from the embed script. When configured, Relay delivers the signed webhook after responding to the visitor.",
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
