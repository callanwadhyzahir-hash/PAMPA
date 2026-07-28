import { createCachedMasterDataLoader } from './master-data.service';

const getCurrencies = createCachedMasterDataLoader('/currencies');

export { getCurrencies };
