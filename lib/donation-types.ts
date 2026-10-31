export type DonationStatus = "Pendiente" | "Aceptada" | "Rechazada" | "Cancelada" | "Entrega informada" | "Entregada";
export type DonationAction = "accept" | "reject" | "cancel" | "deliver" | "receive";
export interface Donation {
  id: number; title: string; description: string; condition: string;
  donorId: number; recipientId: number; donorName: string; recipientName: string;
  status: DonationStatus; createdAt: string; updatedAt: string;
}
export interface DonationInput { recipientId: number; title: string; description: string; condition: string; }
