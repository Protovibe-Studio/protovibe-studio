// plugins/protovibe/src/ui/events/openPrompt.ts
// Any panel can send the user to a specific prompt: the shell switches the
// sidebar to Prompts and the Prompts tab opens that prompt's detail view.
export const PV_OPEN_PROMPT_EVENT = 'pv-open-prompt';

export type OpenPromptDetail = { promptId: string };

export function openPrompt(promptId: string) {
  window.dispatchEvent(new CustomEvent<OpenPromptDetail>(PV_OPEN_PROMPT_EVENT, { detail: { promptId } }));
}
