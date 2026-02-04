import type { CardRepository } from "~/db/repositories/card-repository";
import type { ProjectRepository } from "~/db/repositories/project-repository";
import type { IAgentCodeQuery } from "~/services/agent-query.interface";
import { ValidationError, NotFoundError } from "./errors";
import type { Card } from "~/db/types";

export interface GenerateCardTitleInput {
  cardId: string;
}

export interface GenerateCardTitleResult {
  title: string;
  card: Card;
}

export class GenerateCardTitleUseCase {
  constructor(
    private cardRepository: CardRepository,
    private projectRepository: ProjectRepository,
    private agentQuery: IAgentCodeQuery
  ) {}

  async execute(input: GenerateCardTitleInput): Promise<GenerateCardTitleResult> {
    const startTime = Date.now();
    console.log("[generate-title] ===== Starting title generation ===== ");

    if (!input.cardId) {
      throw new ValidationError("cardId is required");
    }

    console.log("[generate-title] Received request:", { cardId: input.cardId });

    // Fetch the card
    console.log("[generate-title] Fetching card from database...");
    const kanbanCard = await this.cardRepository.getCardById(input.cardId);

    if (!kanbanCard) {
      console.error("[generate-title] Card not found:", input.cardId);
      throw new NotFoundError("Card not found");
    }

    console.log("[generate-title] Card found:", {
      id: kanbanCard.id,
      hasTitle: !!kanbanCard.title,
      hasDescription: !!kanbanCard.description,
      descriptionLength: kanbanCard.description?.length || 0,
    });

    // If card already has a title, return it
    if (kanbanCard.title) {
      console.log(
        "[generate-title] Card already has title, returning:",
        kanbanCard.title
      );
      return {
        title: kanbanCard.title,
        card: kanbanCard,
      };
    }

    // Need description to generate title
    if (!kanbanCard.description) {
      console.error("[generate-title] Card missing description");
      throw new ValidationError("Card must have a description to generate title");
    }

    // Fetch the project to get the file path for cwd
    if (!kanbanCard.projectId) {
      console.error("[generate-title] Card has no projectId");
      throw new ValidationError("Card must be associated with a project");
    }

    const project = await this.projectRepository.getProjectById(kanbanCard.projectId);

    if (!project) {
      console.error("[generate-title] Project not found:", kanbanCard.projectId);
      throw new NotFoundError("Project not found");
    }

    const projectPath = project.filePath;
    console.log("[generate-title] Using project path as cwd:", projectPath);

    // Generate title using Agent SDK with Haiku model
    const prompt = `Based on the following feature description, generate a concise, descriptive title (maximum 60 characters). Return only the title, nothing else.

Description: ${kanbanCard.description}`;

    console.log("[generate-title] Prompt prepared:", {
      promptLength: prompt.length,
      descriptionPreview: kanbanCard.description.substring(0, 100),
    });

    console.log("[generate-title] Starting agent query...");
    const stream = this.agentQuery.query({
      prompt,
      model: "claude-haiku-4-5",
      cwd: projectPath,
      maxTurns: 1,
      allowedTools: [],
    });

    console.log("[generate-title] Query options configured:", {
      model: "claude-haiku-4-5",
      maxTurns: 1,
      cwd: projectPath,
    });

    let generatedTitle = "";
    let messageCount = 0;
    let assistantMessageFound = false;

    console.log("[generate-title] Processing stream messages...");
    for await (const msg of stream) {
      messageCount++;
      // Use any type to access dynamic properties from agent SDK
      const msgAny: any = msg;
      console.log(`[generate-title] Message ${messageCount} received:`, {
        type: msgAny.type,
        subtype: msgAny.subtype,
        hasMessage: !!msgAny.message,
        hasContent: !!msgAny.message?.content,
      });

      // Look for assistant messages with text content
      if (msgAny.type === "assistant" && msgAny.message?.content) {
        assistantMessageFound = true;
        console.log(
          "[generate-title] Assistant message found, processing content..."
        );

        const textBlocks = msgAny.message.content.filter(
          (b: any) => b.type === "text"
        );

        console.log("[generate-title] Text blocks found:", textBlocks.length);

        if (textBlocks.length > 0) {
          // Extract text from the content block
          const textContent = (textBlocks[0] as any).text || "";
          console.log("[generate-title] Text content extracted:", {
            length: textContent.length,
            preview: textContent.substring(0, 100),
          });

          generatedTitle = textContent.trim();
          break; // Got the response, exit loop
        }
      }
    }

    console.log("[generate-title] Stream processing complete:", {
      totalMessages: messageCount,
      assistantMessageFound,
      generatedTitleLength: generatedTitle.length,
      generatedTitle,
    });

    if (!generatedTitle) {
      console.error("[generate-title] No title generated from agent response");
      throw new Error("Failed to generate title - no response from agent");
    }

    // Clean up the title - remove quotes if present, limit length
    let cleanedTitle = generatedTitle.replace(/^["']|["']$/g, "");
    cleanedTitle = cleanedTitle.substring(0, 60).trim();

    console.log("[generate-title] Title cleaned:", {
      original: generatedTitle,
      cleaned: cleanedTitle,
      length: cleanedTitle.length,
    });

    if (!cleanedTitle) {
      console.error("[generate-title] Title is empty after cleaning");
      throw new Error("Failed to generate title - empty result");
    }

    // Update the card with the generated title
    console.log("[generate-title] Updating card in database...");
    const updatedCard = await this.cardRepository.updateCard(input.cardId, {
      title: cleanedTitle,
      updatedAt: new Date(),
    });

    const duration = Date.now() - startTime;
    console.log(
      "[generate-title] ===== Title generation completed successfully =====",
      {
        cardId: input.cardId,
        generatedTitle: cleanedTitle,
        durationMs: duration,
      }
    );

    return {
      title: cleanedTitle,
      card: updatedCard,
    };
  }
}
