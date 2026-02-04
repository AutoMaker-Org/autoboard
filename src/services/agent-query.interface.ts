/**
 * Interface for agent code query functionality.
 * Abstracts the communication with agent code query providers (Claude, Codex, Cursor CLI, etc.).
 */

/**
 * Content block within an agent message.
 */
export interface AgentMessageContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

/**
 * Message structure from agent query stream.
 */
export interface AgentMessage {
  type: string;
  subtype?: string;
  message?: {
    content?: AgentMessageContentBlock[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Options for querying an agent.
 */
export interface AgentQueryOptions {
  /** The prompt/task for the agent to execute */
  prompt: string;
  /** Model to use (provider-specific, e.g., "claude-haiku-4-5", "claude-sonnet-4-20250514") */
  model: string;
  /** Working directory (project path) for the query */
  cwd: string;
  /** Maximum number of turns before stopping */
  maxTurns?: number;
  /** List of allowed tools (empty array for no tools) */
  allowedTools?: string[];
  /** Permission mode for the SDK */
  permissionMode?: string;
  /** Whether to allow dangerously skipping permissions */
  allowDangerouslySkipPermissions?: boolean;
  /** Environment variables to pass to the SDK */
  env?: Record<string, string | undefined>;
  /** Optional system prompt */
  systemPrompt?: string;
  /** Optional abort controller for cancellation */
  abortController?: AbortController;
}

/**
 * Interface for agent code query provider.
 * Implementations handle all SDK-specific details internally.
 */
export interface IAgentCodeQuery {
  /**
   * Execute a query against an agent's code query function.
   *
   * @param options - Configuration options for the query
   * @returns AsyncGenerator that yields agent messages from the stream
   */
  query(options: AgentQueryOptions): AsyncGenerator<AgentMessage>;
}
