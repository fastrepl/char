export const loadJsonData = async <T,>(path: string): Promise<T> => {
  const module = await import(/* @vite-ignore */ path);
  return module.default;
};

export const mergeRecords = <T,>(
  base: Record<string, T>,
  override: Record<string, Partial<T>>,
): Record<string, T> => {
  const result = { ...base };

  Object.entries(override).forEach(([key, value]) => {
    if (result[key]) {
      result[key] = { ...result[key], ...value };
    } else {
      result[key] = value as T;
    }
  });

  return result;
};

export const overrideById = <T extends { id?: string }>(
  generated: Record<string, T>,
  staticData: T[],
): Record<string, T> => {
  const result = { ...generated };

  staticData.forEach((item) => {
    const itemId = item.id;
    if (itemId && result[itemId]) {
      result[itemId] = { ...result[itemId], ...item };
    }
  });

  return result;
};

export const appendRecords = <T,>(
  base: Record<string, T>,
  additional: Record<string, T>,
): Record<string, T> => {
  return { ...base, ...additional };
};
