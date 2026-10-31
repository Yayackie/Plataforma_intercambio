import type { Listing, Report, UserAccount } from "./marketplace-types";
export const careers = ["Ingeniería en Industrias Alimentarias", "Ingeniería Mecatrónica", "Ingeniería Automotriz"];
export const categories = ["Equipos / Instrumentación", "Insumos / Consumibles", "Seguridad / Higiene", "Material didáctico"] as const;
export const initialListings: Listing[] = [
  { id: 1, title: "Multímetro digital", description: "Con puntas y funda. Ideal para prácticas de circuitos.", category: "Equipos / Instrumentación", mode: "Préstamo", status: "Disponible", condition: "Excelente", career: "Ingeniería Mecatrónica", semester: 4, owner: "Diego M.", returnDays: 5, accent: "#d8ff3e", icon: "tool" },
  { id: 2, title: "Cálculo vectorial", description: "Sexta edición, ejercicios resueltos y notas útiles.", category: "Material didáctico", mode: "Venta", status: "Disponible", condition: "Bueno", career: "Ingeniería Mecatrónica", semester: 3, owner: "Renata G.", price: 280, accent: "#8cf6ff", icon: "book" },
  { id: 3, title: "Bata de laboratorio", description: "Talla M, manga larga. Sin manchas ni roturas.", category: "Seguridad / Higiene", mode: "Donación", status: "En negociación", condition: "Muy bueno", career: "Ingeniería en Industrias Alimentarias", semester: 2, owner: "Camila R.", accent: "#ff8f70", icon: "shield" },
  { id: 4, title: "Kit Arduino Uno", description: "Incluye protoboard, jumpers, LEDs y sensores básicos.", category: "Equipos / Instrumentación", mode: "Venta", status: "Disponible", condition: "Excelente", career: "Ingeniería Mecatrónica", semester: 5, owner: "Jorge L.", price: 650, accent: "#a89bff", icon: "box" },
  { id: 5, title: "Vidriería básica", description: "Dos matraces y tres vasos de precipitados.", category: "Equipos / Instrumentación", mode: "Préstamo", status: "Prestado", condition: "Bueno", career: "Ingeniería en Industrias Alimentarias", semester: 3, owner: "Tú", returnDays: 7, accent: "#ffcf5a", icon: "flask", mine: true },
  { id: 6, title: "Formulario de estática", description: "Apuntes claros, tablas y problemas tipo examen.", category: "Material didáctico", mode: "Donación", status: "Disponible", condition: "Bueno", career: "Ingeniería Automotriz", semester: 2, owner: "Tú", accent: "#5be7b7", icon: "calc", mine: true },
];
export const initialReports: Report[] = [{ id: 1, target: "Kit de herramientas industrial", type: "Publicación", reason: "La descripción no coincide con el artículo entregado.", reporter: "Mariana P.", resolved: false }, { id: 2, target: "Usuario: Carlos N.", type: "Usuario", reason: "No se presentó en dos entregas acordadas.", reporter: "Luis A.", resolved: false }, { id: 3, target: "Calculadora científica", type: "Publicación", reason: "Precio potencialmente engañoso.", reporter: "Ana V.", resolved: true }];
export const initialUsers: UserAccount[] = [
  { id: 1, name: "Prueba 123", email: "prueba123@itesa.edu.mx", career: "Ingeniería Mecatrónica", semester: 4, role: "Estudiante", status: "Activo", initials: "P1" },
  { id: 2, name: "Prueba 456", email: "prueba456@itesa.edu.mx", career: "Ingeniería en Industrias Alimentarias", semester: 5, role: "Estudiante", status: "Activo", initials: "P4" },
  { id: 3, name: "Prueba 789", email: "prueba789@itesa.edu.mx", career: "Ingeniería Automotriz", semester: 4, role: "Estudiante", status: "Activo", initials: "P7" },
  { id: 4, name: "Administración Prueba", email: "admin123@itesa.edu.mx", career: null, semester: null, role: "Administrador", status: "Activo", initials: "AP" },
];
