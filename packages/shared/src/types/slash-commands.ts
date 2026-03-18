export interface SlashCommandDefinition {
  name: string;
  description: string;
  usage: string;
  /** Example input after the command name */
  example: string;
}

export const SLASH_COMMANDS: SlashCommandDefinition[] = [
  {
    name: "poll",
    description: "Create a poll for the channel",
    usage: '/poll "Question" "Option 1" "Option 2" ...',
    example: '/poll "Lunch spot?" "Pizza" "Sushi" "Tacos"',
  },
  {
    name: "remind",
    description: "Set a reminder via DM",
    usage: "/remind me in <duration> to <text>",
    example: "/remind me in 30m to review the PR",
  },
  {
    name: "summarize",
    description: "Summarize the last 50 messages",
    usage: "/summarize",
    example: "/summarize",
  },
  {
    name: "translate",
    description: "Translate the last message",
    usage: "/translate <language>",
    example: "/translate Spanish",
  },
  {
    name: "weather",
    description: "Get current weather for a city",
    usage: "/weather <city>",
    example: "/weather Tokyo",
  },
  {
    name: "whiteboard",
    description: "Create a collaborative whiteboard",
    usage: "/whiteboard [title]",
    example: "/whiteboard Architecture Diagram",
  },
];
