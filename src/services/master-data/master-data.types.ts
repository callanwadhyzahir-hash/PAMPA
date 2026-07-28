type MasterDataOption = {
  id: string;
  label: string;
  code?: string;
};

type MasterDataApiRecord = {
  id: string;
  name: string;
  code?: string;
  is_active?: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  timestamp: string;
  data: T;
};

export type { ApiResponse, MasterDataApiRecord, MasterDataOption };
