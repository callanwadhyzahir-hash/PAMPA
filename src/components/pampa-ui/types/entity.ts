export type EntityRecord = {
  id: string;
};

export type EntityMetadata = {
  singular: string;
  plural: string;
  gender: 'female' | 'male';
};

export type EntityAction<T extends EntityRecord> = {
  id: string;
  label: string;
  onSelect: (item: T) => void;
  destructive?: boolean;
};
