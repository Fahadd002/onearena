export type DropdownOption = { label: string; value: string };

export const toDropdownOptions = <T extends { id: string; name: string }>(
  items: T[],
): DropdownOption[] => items.map((item) => ({ label: item.name, value: item.id }));
