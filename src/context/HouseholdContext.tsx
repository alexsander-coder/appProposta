import type { ReactNode } from "react";
import { createContext, useContext } from "react";

export type HouseholdContextValue = {
  userId: string;
  email?: string;
  householdId: string;
  householdName: string;
  refreshHousehold: () => void | Promise<void>;
};

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({
  value,
  children,
}: {
  value: HouseholdContextValue;
  children: ReactNode;
}) {
  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) {
    throw new Error("useHousehold deve ser usado dentro de HouseholdProvider");
  }
  return ctx;
}
