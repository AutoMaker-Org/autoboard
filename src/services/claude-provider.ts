/**
 * Claude Provider - Implementation of IAgentCodeQuery interface.
 * Contains all implementation details for running Claude code queries.
 */

import { query, type Options } from "@anthropic-ai/claude-agent-sdk";
import type {
  IAgentCodeQuery,
  AgentQueryOptions,
  AgentMessage,
} from "./agent-query.interface";

/**
 * System environment variables to pass to the SDK.
 */
const SYSTEM_ENV_VARS = [
  "PATH",
  "HOME",
  "SHELL",
  "TERM",
  "USER",
  "LANG",
  "LC_ALL",
];

/**
 * Build environment object for the SDK from process.env.
 */
function buildEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};
  for (const key of SYSTEM_ENV_VARS) {
    if (process.env[key]) {
      env[key] = process.env[key];
    }
  }
  return env;
}

/**
 * ClaudeProvider - Implements IAgentCodeQuery interface.
 * Handles all SDK-specific details for communicating with Claude's code query function.
 */
class ClaudeProvider implements IAgentCodeQuery {
  /**
   * Execute a query against Claude's code query function.
   *
   * @param options - Configuration options for the query
   * @returns AsyncGenerator that yields agent messages from the stream
   */
  async *query(options: AgentQueryOptions): AsyncGenerator<AgentMessage> {
    const {
      prompt,
      model,
      cwd,
      maxTurns = 1,
      allowedTools = [],
      permissionMode = "bypassPermissions",
      allowDangerouslySkipPermissions = true,
      env = buildEnv(),
      systemPrompt,
      abortController,
    } = options;

    // Convert AgentQueryOptions to SDK Options type
    const sdkOptions: Options = {
      model,
      cwd,
      maxTurns,
      allowedTools,
      permissionMode,
      allowDangerouslySkipPermissions,
      env,
      ...(systemPrompt && { systemPrompt }),
      ...(abortController && { abortController }),
    };

    // Execute query using SDK
    const stream = query({ prompt, options: sdkOptions });

    // Yield messages from the stream
    for await (const msg of stream) {
      yield msg as AgentMessage;
    }
  }
}

/**
 * Singleton instance of ClaudeProvider for use across the application.
 */
export const claudeProvider = new ClaudeProvider();
