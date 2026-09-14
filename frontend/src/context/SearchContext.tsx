"use client";
import React, { createContext, useContext, useState, useCallback, useRef } from "react";

type SearchHandler = (query: string) => void;

type SearchContextType = {
  query: string;
  setQuery: (q: string) => void;
  placeholder: string;
  setPlaceholder: (p: string) => void;
  registerHandler: (handler: SearchHandler) => void;
  unregisterHandler: () => void;
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
};

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [query, setQuery] = useState("");
  const [placeholder, setPlaceholder] = useState("Search or type command...");
  const handlerRef = useRef<SearchHandler | null>(null);

  const registerHandler = useCallback((handler: SearchHandler) => {
    handlerRef.current = handler;
  }, []);

  const unregisterHandler = useCallback(() => {
    handlerRef.current = null;
  }, []);

  const handleSetQuery = useCallback((q: string) => {
    setQuery(q);
    if (handlerRef.current) {
      handlerRef.current(q);
    }
  }, []);

  return (
    <SearchContext.Provider
      value={{ query, setQuery: handleSetQuery, placeholder, setPlaceholder, registerHandler, unregisterHandler }}
    >
      {children}
    </SearchContext.Provider>
  );
};
