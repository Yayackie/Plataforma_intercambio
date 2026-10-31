export interface ActivityEvent {
  id: string; category: string; title: string; detail: string; occurredAt: string;
  source: "server" | "local";
}
