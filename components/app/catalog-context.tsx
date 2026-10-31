"use client";
import { createContext,useContext } from "react";
import { careers,categories } from "@/lib/demo-data";
export const CatalogContext=createContext<{careers:string[];categories:string[]}>({careers:[...careers],categories:[...categories]});
export const useCatalog=()=>useContext(CatalogContext);
