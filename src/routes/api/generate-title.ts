import { APIEvent } from "@solidjs/start/server";
import { cardRepository, projectRepository } from "~/db/repositories";
import { claudeProvider } from "~/services/claude-provider";
import { GenerateCardTitleUseCase } from "~/use-cases";
import { ValidationError, NotFoundError } from "~/use-cases/errors";

/**
 * POST /api/generate-title
 *
 * Generates a title for a card using Anthropic Agent SDK with Haiku model.
 *
 * Request body:
 * - cardId: string (required) - The ID of the card to generate title for
 *
 * Returns:
 * - 200: { title: string } - The generated title
 * - 400: { error: "..." } for validation errors
 * - 404: { error: "..." } if card not found
 * - 500: { error: "..." } for server errors
 */
export async function POST({ request }: APIEvent) {
  try {
    const body = await request.json();
    const { cardId } = body;

    const useCase = new GenerateCardTitleUseCase(
      cardRepository,
      projectRepository,
      claudeProvider
    );
    const result = await useCase.execute({ cardId });

    return Response.json({ title: result.title, card: result.card });
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof NotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    console.error("[generate-title] Error generating title:", error);
    return Response.json(
      { error: "Failed to generate title" },
      { status: 500 }
    );
  }
}
