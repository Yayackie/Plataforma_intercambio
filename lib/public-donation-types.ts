export interface PublicDonation {
  id: number; donorId: number; donorName: string; title: string; description: string; condition: string;
  demo: boolean; createdAt: string; status: "Disponible" | "Asignada" | "Retirada";
  requested: boolean; selected: boolean;
  applicants: {id: number; name: string}[];
}
