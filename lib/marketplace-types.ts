export type View = "inicio" | "catalogo" | "publicaciones" | "mensajes" | "prestamos" | "admin";
export type Mode = "Venta" | "Préstamo" | "Donación";
export type Status = "Disponible" | "En negociación" | "Prestado" | "Cerrado";
export type Category = "Equipos / Instrumentación" | "Insumos / Consumibles" | "Seguridad / Higiene" | "Material didáctico";
export interface Listing { id: number; title: string; description: string; category: Category; mode: Mode; status: Status; condition: string; career: string; semester: number; owner: string; price?: number; returnDays?: number; accent: string; icon: "tool" | "book" | "shield" | "flask" | "calc" | "box"; mine?: boolean; hidden?: boolean; }
export interface Conversation { id: number; person: string; listing: string; avatar: string; online: boolean; messages: { from: "me" | "them"; text: string; time: string }[]; }
export interface Loan { id: number; listingId: number; item: string; counterpart: string; due: string; borrowerConfirmed: boolean; ownerConfirmed: boolean; role: "borrower" | "owner"; }
export interface Report { id: number; target: string; type: "Publicación" | "Usuario"; reason: string; reporter: string; resolved: boolean; }
export interface UserAccount { id: number; name: string; email: string; career: string | null; semester: number | null; role: "Estudiante" | "Administrador"; status: "Activo" | "Suspendido"; initials: string; }
export interface UserAccountInput { name: string; email: string; password?: string; career: string | null; semester: number | null; role: UserAccount["role"]; }
